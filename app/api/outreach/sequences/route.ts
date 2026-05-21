import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import type { OutreachSequence } from "@/lib/firestore/types";
import { CreateSequenceSchema } from "@/lib/outreach/schemas";

export async function GET(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 25));
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.outreachSequences)
    .where("organizationId", "==", ctx.orgId)
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();

  const sequences = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OutreachSequence);
  return NextResponse.json({ sequences });
}

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

  const parsed = CreateSequenceSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const id = randomUUID();
  const now = Date.now();
  const db = getAdminFirestore();
  const steps = parsed.data.steps.map((s) => ({
    ...s,
    id: s.id || randomUUID(),
  }));

  const sequence: OutreachSequence = {
    id,
    organizationId: ctx.orgId,
    name: parsed.data.name,
    status: parsed.data.status,
    steps,
    createdAt: now,
    updatedAt: now,
    createdByUid: ctx.user.uid,
  };

  await db.collection(col.outreachSequences).doc(id).set(sequence);

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "outreach.sequence.create",
    resource: `${col.outreachSequences}/${id}`,
    payload: { name: sequence.name },
  });

  return NextResponse.json(sequence);
}
