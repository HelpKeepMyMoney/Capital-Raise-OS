import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { canEditOrgData } from "@/lib/auth/rbac";
import { memberCanAccessDataRoom } from "@/lib/auth/investor-access";
import { requireOrgSession } from "@/lib/auth/session";
import { listInvestorCompletedNdaRoomIds, normalizeInvestorEmailForNda } from "@/lib/data-room/investor-nda-gate";
import { getAdminFirestore, getAdminBucket } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId } = (await req.json()) as { documentId?: string };
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const db = getAdminFirestore();
  const doc = await db.collection(col.documents).doc(documentId).get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = doc.data() as {
    organizationId?: string;
    storagePath?: string;
    name?: string;
    dataRoomId?: string;
  };
  if (data.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!data.storagePath) return NextResponse.json({ error: "Invalid document" }, { status: 400 });

  const dataRoomId = typeof data.dataRoomId === "string" ? data.dataRoomId : "";
  if (!dataRoomId) {
    return NextResponse.json({ error: "Invalid document" }, { status: 400 });
  }

  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!canEditOrgData(membership.role)) {
    const roomSnap = await db.collection(col.dataRooms).doc(dataRoomId).get();
    const roomMeta = roomSnap.data() as { organizationId?: string; dealId?: string; ndaRequired?: boolean } | undefined;
    if (!roomSnap.exists || roomMeta?.organizationId !== ctx.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!memberCanAccessDataRoom(membership, dataRoomId, { dealId: roomMeta?.dealId })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (roomMeta?.ndaRequired) {
      const emailNorm = normalizeInvestorEmailForNda(ctx.user.email ?? "");
      if (!emailNorm) {
        return NextResponse.json({ error: "Sign in with an email address to accept the NDA and view documents." }, { status: 403 });
      }
      const completed = await listInvestorCompletedNdaRoomIds(db, ctx.orgId, emailNorm);
      if (!completed.has(dataRoomId)) {
        return NextResponse.json(
          { error: "You must complete the sponsor’s mutual NDA for this room before viewing documents." },
          { status: 403 },
        );
      }
    }
  }

  const bucket = getAdminBucket();
  const file = bucket.file(data.storagePath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 15 * 60 * 1000,
  });

  await db
    .collection(col.documents)
    .doc(documentId)
    .update({
      viewCount: FieldValue.increment(1),
      lastViewedAt: Date.now(),
    });

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "data_room.signed_url",
    resource: `${col.documents}/${documentId}`,
  });

  return NextResponse.json({ url, name: data.name });
}
