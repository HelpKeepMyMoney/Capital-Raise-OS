import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";
import type { TaskPriority, TaskType, TaskWorkflowStatus } from "@/lib/firestore/types";

const WORKFLOW: TaskWorkflowStatus[] = [
  "not_started",
  "in_progress",
  "waiting",
  "blocked",
];

function isTaskPriority(v: unknown): v is TaskPriority {
  return v === "low" || v === "medium" || v === "high" || v === "urgent";
}

function isTaskType(v: unknown): v is TaskType {
  return (
    v === "follow_up" ||
    v === "call_investor" ||
    v === "send_docs" ||
    v === "review_commitment" ||
    v === "prepare_closing" ||
    v === "update_room" ||
    v === "other"
  );
}

function isWorkflow(v: unknown): v is TaskWorkflowStatus {
  return typeof v === "string" && WORKFLOW.includes(v as TaskWorkflowStatus);
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;

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
    updatedAt: now,
    createdByUserId: ctx.user.uid,
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
  if (typeof body.linkedDataRoomId === "string" && body.linkedDataRoomId.trim()) {
    payload.linkedDataRoomId = body.linkedDataRoomId.trim();
  }
  if (typeof body.description === "string" && body.description.trim()) {
    payload.description = body.description.trim();
  }
  if (typeof body.notes === "string" && body.notes.trim()) {
    payload.notes = body.notes.trim();
  }
  if (isWorkflow(body.workflowStatus)) {
    payload.workflowStatus = body.workflowStatus;
  }
  if (isTaskPriority(body.taskPriority)) {
    payload.taskPriority = body.taskPriority;
  }
  if (isTaskType(body.taskType)) {
    payload.taskType = body.taskType;
  }
  if (typeof body.reminderAt === "number" && body.reminderAt > 0) {
    payload.reminderAt = body.reminderAt;
  }
  if (typeof body.repeatSchedule === "string" && body.repeatSchedule.trim()) {
    payload.repeatSchedule = body.repeatSchedule.trim();
  }
  if (typeof body.snoozedUntil === "number" && body.snoozedUntil > 0) {
    payload.snoozedUntil = body.snoozedUntil;
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

  return NextResponse.json({
    id,
    title,
    dueAt,
    status: "open",
    createdAt: now,
    ...payload,
  });
}
