import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminBucket, getAdminFirestore } from "@/lib/firebase/admin";
import { sendEsignEnvelopeCreatedEmails } from "@/lib/esign/envelope-notify";
import { getOrganization, getMembership } from "@/lib/firestore/queries";
import {
  createAdhocEnvelope,
  createNdaEnvelope,
  loadTemplate,
} from "@/lib/esign/envelope-service";
import { col } from "@/lib/firestore/paths";
import type { DataRoom } from "@/lib/firestore/types";

const CreateBodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("data_room_nda"),
    dataRoomId: z.string().min(1),
    investorEmail: z.string().email(),
    investorName: z.string().max(200).optional(),
    /** Optional when the room form has a template selected but settings were not saved yet. */
    signableTemplateId: z.string().uuid().optional(),
  }),
  z.object({
    kind: z.literal("deal_subscription"),
    dealId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("ad_hoc"),
    templateId: z.string().uuid(),
    investorEmail: z.string().email(),
    investorName: z.string().max(200).optional(),
    label: z.string().max(200).optional(),
  }),
]);

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  }

  const db = getAdminFirestore();
  const bucket = getAdminBucket();
  const body = parsed.data;

  if (body.kind === "deal_subscription") {
    return NextResponse.json({ error: "Use POST /api/esign/subscription/create for LP subscription" }, { status: 400 });
  }

  if (body.kind === "ad_hoc") {
    const template = await loadTemplate(db, ctx.orgId, body.templateId);
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    const [exists] = await bucket.file(template.storagePath).exists();
    if (!exists) return NextResponse.json({ error: "Upload the template PDF first" }, { status: 400 });
    const invName =
      body.investorName?.trim() || body.investorEmail.split("@")[0] || "Investor";
    const sponsorEmail = ctx.user.email?.trim().toLowerCase();
    if (!sponsorEmail) {
      return NextResponse.json({ error: "Your account needs an email to send signing requests." }, { status: 400 });
    }
    const { envelope, sponsorUrl, investorUrl } = await createAdhocEnvelope({
      db,
      organizationId: ctx.orgId,
      template,
      createdByUid: ctx.user.uid,
      sponsorEmailNorm: sponsorEmail,
      investorEmail: body.investorEmail,
      investorName: invName,
      label: body.label,
    });

    const orgAdhoc = await getOrganization(ctx.orgId);
    await sendEsignEnvelopeCreatedEmails({
      orgName: orgAdhoc?.name ?? "CapitalOS",
      sponsorEmail,
      investorEmail: body.investorEmail.trim().toLowerCase(),
      investorName: invName,
      sponsorUrl,
      investorUrl,
      context: { kind: "ad_hoc", label: body.label },
    });

    return NextResponse.json({
      ok: true,
      id: envelope.id,
      sponsorSigningUrl: sponsorUrl,
      investorSigningUrl: investorUrl,
      status: envelope.status,
    });
  }

  const roomSnap = await db.collection(col.dataRooms).doc(body.dataRoomId).get();
  if (!roomSnap.exists) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  const room = { id: roomSnap.id, ...(roomSnap.data() as Omit<DataRoom, "id">) } as DataRoom;
  if (room.organizationId !== ctx.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!room.ndaRequired) {
    return NextResponse.json({ error: "Enable NDA required for this room first" }, { status: 400 });
  }

  const fromRoom =
    typeof room.signableTemplateId === "string" && room.signableTemplateId.trim()
      ? room.signableTemplateId.trim()
      : null;
  const fromBody =
    body.kind === "data_room_nda" &&
    typeof body.signableTemplateId === "string" &&
    body.signableTemplateId.trim()
      ? body.signableTemplateId.trim()
      : null;
  const templateId = fromBody ?? fromRoom;
  if (!templateId) {
    return NextResponse.json({ error: "Link a signable template on the data room (Settings)" }, { status: 400 });
  }

  const template = await loadTemplate(db, ctx.orgId, templateId);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  const [pdfOk] = await bucket.file(template.storagePath).exists();
  if (!pdfOk) return NextResponse.json({ error: "Upload the template PDF first" }, { status: 400 });

  const sponsorEmail = ctx.user.email?.trim().toLowerCase();
  if (!sponsorEmail) {
    return NextResponse.json({ error: "Your account needs an email to send signing requests." }, { status: 400 });
  }

  const investorEmail = body.investorEmail.trim().toLowerCase();
  const investorName = body.investorName?.trim() || investorEmail.split("@")[0] || "Investor";

  const { envelope, sponsorUrl, investorUrl } = await createNdaEnvelope({
    db,
    organizationId: ctx.orgId,
    room,
    template,
    createdByUid: ctx.user.uid,
    sponsorEmailNorm: sponsorEmail,
    investorEmail,
    investorName,
  });

  const org = await getOrganization(ctx.orgId);
  await sendEsignEnvelopeCreatedEmails({
    orgName: org?.name ?? "CapitalOS",
    sponsorEmail,
    investorEmail,
    investorName,
    sponsorUrl,
    investorUrl,
    context: { kind: "data_room", roomName: room.name },
  });

  return NextResponse.json({
    ok: true,
    id: envelope.id,
    sponsorSigningUrl: sponsorUrl,
    investorSigningUrl: investorUrl,
    status: envelope.status,
  });
}
