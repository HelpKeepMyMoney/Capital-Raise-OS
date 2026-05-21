import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import type { OutreachSequence } from "@/lib/firestore/types";
import { UpdateSequenceSchema } from "@/lib/outreach/schemas";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getAdminFirestore();
  const snap = await db.collection(col.outreachSequences).doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = snap.data()!;
  if (data.organizationId !== session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: snap.id, ...data } as OutreachSequence);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSequenceSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getAdminFirestore();
  const ref = db.collection(col.outreachSequences).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.organizationId !== session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.steps !== undefined) patch.steps = parsed.data.steps;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;

  await ref.update(patch);

  await writeAuditLog({
    organizationId: session.orgId,
    actorId: session.user.uid,
    action: "outreach.sequence.update",
    resource: `${col.outreachSequences}/${id}`,
  });

  const updated = await ref.get();
  return NextResponse.json({ id, ...updated.data() } as OutreachSequence);
}
