import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import {
  escapeHtmlForEmail,
  invitationsTransactionalFrom,
  textToEmailHtmlParagraphs,
} from "@/lib/invitations/invite-email-shared";

const BodySchema = z.object({
  body: z.string().trim().min(1, "Message is required").max(8000),
  subject: z.string().trim().max(200).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ invitationId: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { invitationId } = await context.params;
  const id = typeof invitationId === "string" ? invitationId.trim() : "";
  if (!id) return NextResponse.json({ error: "Invalid invitation id" }, { status: 400 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 503 });
  }

  const db = getAdminFirestore();
  const ref = db.collection(col.investorInvitations).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  const inv = { id: snap.id, ...(snap.data() as { organizationId?: string; email?: string }) };
  if (inv.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = typeof inv.email === "string" ? inv.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json(
      { error: "This invitation has no email address on file." },
      { status: 400 },
    );
  }

  const org = await db.collection(col.organizations).doc(ctx.orgId).get();
  const orgName = (org.data()?.name as string | undefined) ?? "Your organization";

  const senderAuth = typeof ctx.user.email === "string" ? ctx.user.email : undefined;

  const subj =
    parsed.data.subject?.trim() ||
    `Message from ${orgName}`;
  const bodyHtml =
    `${textToEmailHtmlParagraphs(parsed.data.body)}\n` +
    `<p style="color:#666;font-size:12px">Sent via CapitalOS on behalf of ${escapeHtmlForEmail(orgName)}.</p>`;

  await sendTransactionalEmail({
    from: invitationsTransactionalFrom(),
    to: email,
    subject: subj.slice(0, 200),
    html: bodyHtml,
    ...(senderAuth ? { replyTo: senderAuth } : {}),
  });

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "invite.message",
    resource: `${col.investorInvitations}/${id}`,
    payload: { to: email },
  });

  return NextResponse.json({ ok: true });
}
