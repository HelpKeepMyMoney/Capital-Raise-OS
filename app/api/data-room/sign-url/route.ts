import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore, getAdminBucket } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId } = (await req.json()) as { documentId?: string };
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const db = getAdminFirestore();
  const doc = await db.collection(col.documents).doc(documentId).get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = doc.data() as { organizationId?: string; storagePath?: string; name?: string };
  if (data.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!data.storagePath) return NextResponse.json({ error: "Invalid document" }, { status: 400 });

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
