import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminBucket, getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { SignableTemplate } from "@/lib/firestore/types";
import { getMembership } from "@/lib/firestore/queries";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const db = getAdminFirestore();
  const snap = await db.collection(col.signableTemplates).doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const t = snap.data() as SignableTemplate;
  if (t.organizationId !== session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (t.archived) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bucket = getAdminBucket();
  const file = bucket.file(t.storagePath);
  const [exists] = await file.exists();
  if (!exists) return NextResponse.json({ error: "PDF not uploaded yet" }, { status: 404 });

  const [buf] = await file.download();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(t.name)}.pdf"`,
    },
  });
}
