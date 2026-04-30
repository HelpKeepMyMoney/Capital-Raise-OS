import { NextRequest, NextResponse } from "next/server";
import { memberCanAccessDeal } from "@/lib/auth/investor-access";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminBucket, getAdminFirestore } from "@/lib/firebase/admin";
import { col, signingRequestDocId } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import type { EsignEnvelope } from "@/lib/firestore/types";

export async function GET(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dealId = req.nextUrl.searchParams.get("dealId")?.trim() ?? "";
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const requestedUserId = req.nextUrl.searchParams.get("userId")?.trim() ?? "";
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const canManage = canEditOrgData(membership.role);
  const targetUserId = requestedUserId || ctx.user.uid;
  if (targetUserId !== ctx.user.uid && !canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canManage && !memberCanAccessDeal(membership, dealId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const docId = signingRequestDocId(ctx.orgId, dealId, targetUserId);
  const db = getAdminFirestore();
  const envSnap = await db.collection(col.esignEnvelopes).doc(docId).get();
  if (!envSnap.exists) {
    return NextResponse.json({ error: "Signed packet not found" }, { status: 404 });
  }
  const env = { id: envSnap.id, ...(envSnap.data() as Omit<EsignEnvelope, "id">) };
  if (env.organizationId !== ctx.orgId || env.context.kind !== "deal_subscription") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (env.context.dealId !== dealId || env.context.userId !== targetUserId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (env.status !== "completed") {
    return NextResponse.json({ error: "Document is not completed yet" }, { status: 409 });
  }
  const finalPath = env.finalPdfStoragePath?.trim();
  if (!finalPath) {
    return NextResponse.json({ error: "Completed document missing" }, { status: 404 });
  }

  try {
    const bucket = getAdminBucket();
    const [buf] = await bucket.file(finalPath).download();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="subscription-${dealId}-signed.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[esign subscription final-document]", e);
    return NextResponse.json({ error: "Could not load completed document" }, { status: 500 });
  }
}
