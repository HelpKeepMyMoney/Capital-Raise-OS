import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    title?: string;
    dueAt?: number;
    assigneeId?: string;
    linkedInvestorId?: string;
    linkedDealId?: string;
  };

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const dueAt =
    typeof body.dueAt === "number" && body.dueAt > 0
      ? body.dueAt
      : Date.now() + 7 * 86400000;

  const id = randomUUID();
  const now = Date.now();

  const payload: Record<string, unknown> = {
    id,
    organizationId: ctx.orgId,
    title,
    status: "open",
    dueAt,
    createdAt: now,
  };

  if (typeof body.assigneeId === "string" && body.assigneeId.trim()) {
    payload.assigneeId = body.assigneeId.trim();
  }
  if (typeof body.linkedInvestorId === "string" && body.linkedInvestorId.trim()) {
    payload.linkedInvestorId = body.linkedInvestorId.trim();
  }
  if (typeof body.linkedDealId === "string" && body.linkedDealId.trim()) {
    payload.linkedDealId = body.linkedDealId.trim();
  }

  const db = getAdminFirestore();
  await db.collection(col.tasks).doc(id).set(payload);

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "task.create",
    resource: `${col.tasks}/${id}`,
    payload: { title },
  });

  return NextResponse.json({ id, title, dueAt, status: "open", createdAt: now });
}
