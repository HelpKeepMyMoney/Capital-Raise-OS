import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminBucket, getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import type { EsignEnvelope } from "@/lib/firestore/types";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sess = await requireOrgSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getMembership(sess.orgId, sess.user.uid);
  if (!membership || !canEditOrgData(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const envelopeId = id?.trim();
  if (!envelopeId) return NextResponse.json({ error: "envelope id required" }, { status: 400 });

  const db = getAdminFirestore();
  const snap = await db.collection(col.esignEnvelopes).doc(envelopeId).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const env = { id: snap.id, ...(snap.data() as Omit<EsignEnvelope, "id">) };
  if (env.organizationId !== sess.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (env.status !== "completed") return NextResponse.json({ error: "Document not completed" }, { status: 409 });
  if (env.context.kind !== "data_room_nda" && env.context.kind !== "ad_hoc") {
    return NextResponse.json({ error: "Unsupported envelope type" }, { status: 400 });
  }

  const finalPath = env.finalPdfStoragePath?.trim();
  if (!finalPath) return NextResponse.json({ error: "Completed document missing" }, { status: 404 });

  try {
    const [buf] = await getAdminBucket().file(finalPath).download();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nda-${env.id}-signed.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[esign envelopes final-document]", e);
    return NextResponse.json({ error: "Could not load completed document" }, { status: 500 });
  }
}
