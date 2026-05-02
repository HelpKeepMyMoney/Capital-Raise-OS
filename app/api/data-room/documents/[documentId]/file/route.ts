import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireOrgSession } from "@/lib/auth/session";
import { authorizeRoomDocumentRead } from "@/lib/data-room/authorize-room-document-read";
import { getAdminFirestore, getAdminBucket } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { writeAuditLog } from "@/lib/audit";

/**
 * Same authorization as POST /api/data-room/sign-url, but streams the file through the app origin
 * so the browser can load PDF bytes without cross-origin (GCS) fetch issues.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId } = await context.params;
  const auth = await authorizeRoomDocumentRead(ctx, documentId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const bucket = getAdminBucket();
  const file = bucket.file(auth.storagePath);
  let buf: Buffer;
  try {
    [buf] = await file.download();
  } catch {
    return NextResponse.json({ error: "Could not read file" }, { status: 502 });
  }

  const db = getAdminFirestore();
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
    action: "data_room.document_file_download",
    resource: `${col.documents}/${documentId}`,
  });

  const contentType =
    auth.mimeType && auth.mimeType.length > 0 ? auth.mimeType : "application/octet-stream";

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(auth.name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
