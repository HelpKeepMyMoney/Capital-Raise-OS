import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";
import type {
  Task,
  TaskPriority,
  TaskType,
  TaskWorkflowStatus,
} from "@/lib/firestore/types";

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

/** Keeps investor nextFollowUpAt / followUpTaskId aligned with CRM follow-up tasks. */
async function syncInvestorFollowUpFields(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  taskId: string,
  after: Task,
) {
  if (!after.linkedInvestorId || !after.isInvestorFollowUp) return;

  const invRef = db.collection(col.investors).doc(after.linkedInvestorId);
  const invSnap = await invRef.get();
  if (!invSnap.exists) return;

  const inv = invSnap.data() as { organizationId?: string; followUpTaskId?: string };
  if (inv.organizationId !== orgId) return;

  if (after.status === "done" || after.status === "cancelled") {
    if (inv.followUpTaskId === taskId) {
      await invRef.update({
        nextFollowUpAt: null,
        followUpTaskId: null,
        updatedAt: Date.now(),
      });
      revalidatePath(`/investors/${after.linkedInvestorId}`);
    }
    return;
  }

  if (after.status === "open" && after.dueAt != null) {
    await invRef.update({
      nextFollowUpAt: after.dueAt,
      followUpTaskId: taskId,
      updatedAt: Date.now(),
    });
    revalidatePath(`/investors/${after.linkedInvestorId}`);
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const db = getAdminFirestore();
  const snap = await db.collection(col.tasks).doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const task = { id: snap.id, ...(snap.data() as Omit<Task, "id">) };
  if (task.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(task);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as Record<string, unknown>;

  const db = getAdminFirestore();
  const ref = db.collection(col.tasks).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const task = snap.data() as Task;
  if (task.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {
    updatedAt: Date.now(),
  };

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }
    patch.title = body.title.trim();
  }

  if (body.status !== undefined) {
    const status = body.status;
    if (status !== "open" && status !== "done" && status !== "cancelled") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = status;
  }

  if (body.dueAt !== undefined) {
    if (body.dueAt === null) patch.dueAt = FieldValue.delete();
    else if (typeof body.dueAt === "number" && body.dueAt > 0) patch.dueAt = body.dueAt;
    else return NextResponse.json({ error: "Invalid dueAt" }, { status: 400 });
  }

  if (body.assigneeId !== undefined) {
    if (body.assigneeId === null || body.assigneeId === "") {
      patch.assigneeId = FieldValue.delete();
    } else if (typeof body.assigneeId === "string") {
      patch.assigneeId = body.assigneeId.trim();
    } else return NextResponse.json({ error: "Invalid assigneeId" }, { status: 400 });
  }

  if (body.linkedInvestorId !== undefined) {
    if (body.linkedInvestorId === null || body.linkedInvestorId === "") {
      patch.linkedInvestorId = FieldValue.delete();
    } else if (typeof body.linkedInvestorId === "string") {
      patch.linkedInvestorId = body.linkedInvestorId.trim();
    } else return NextResponse.json({ error: "Invalid linkedInvestorId" }, { status: 400 });
  }

  if (body.linkedDealId !== undefined) {
    if (body.linkedDealId === null || body.linkedDealId === "") {
      patch.linkedDealId = FieldValue.delete();
    } else if (typeof body.linkedDealId === "string") {
      patch.linkedDealId = body.linkedDealId.trim();
    } else return NextResponse.json({ error: "Invalid linkedDealId" }, { status: 400 });
  }

  if (body.linkedDataRoomId !== undefined) {
    if (body.linkedDataRoomId === null || body.linkedDataRoomId === "") {
      patch.linkedDataRoomId = FieldValue.delete();
    } else if (typeof body.linkedDataRoomId === "string") {
      patch.linkedDataRoomId = body.linkedDataRoomId.trim();
    } else return NextResponse.json({ error: "Invalid linkedDataRoomId" }, { status: 400 });
  }

  if (body.workflowStatus !== undefined) {
    if (body.workflowStatus === null || body.workflowStatus === "") {
      patch.workflowStatus = FieldValue.delete();
    } else if (isWorkflow(body.workflowStatus)) {
      patch.workflowStatus = body.workflowStatus;
    } else return NextResponse.json({ error: "Invalid workflowStatus" }, { status: 400 });
  }

  if (body.taskPriority !== undefined) {
    if (body.taskPriority === null || body.taskPriority === "") {
      patch.taskPriority = FieldValue.delete();
    } else if (isTaskPriority(body.taskPriority)) {
      patch.taskPriority = body.taskPriority;
    } else return NextResponse.json({ error: "Invalid taskPriority" }, { status: 400 });
  }

  if (body.taskType !== undefined) {
    if (body.taskType === null || body.taskType === "") {
      patch.taskType = FieldValue.delete();
    } else if (isTaskType(body.taskType)) {
      patch.taskType = body.taskType;
    } else return NextResponse.json({ error: "Invalid taskType" }, { status: 400 });
  }

  if (body.description !== undefined) {
    if (body.description === null || body.description === "") {
      patch.description = FieldValue.delete();
    } else if (typeof body.description === "string") {
      patch.description = body.description;
    } else return NextResponse.json({ error: "Invalid description" }, { status: 400 });
  }

  if (body.notes !== undefined) {
    if (body.notes === null || body.notes === "") {
      patch.notes = FieldValue.delete();
    } else if (typeof body.notes === "string") {
      patch.notes = body.notes;
    } else return NextResponse.json({ error: "Invalid notes" }, { status: 400 });
  }

  if (body.snoozedUntil !== undefined) {
    if (body.snoozedUntil === null) {
      patch.snoozedUntil = FieldValue.delete();
    } else if (typeof body.snoozedUntil === "number" && body.snoozedUntil > 0) {
      patch.snoozedUntil = body.snoozedUntil;
    } else return NextResponse.json({ error: "Invalid snoozedUntil" }, { status: 400 });
  }

  if (body.reminderAt !== undefined) {
    if (body.reminderAt === null) {
      patch.reminderAt = FieldValue.delete();
    } else if (typeof body.reminderAt === "number" && body.reminderAt > 0) {
      patch.reminderAt = body.reminderAt;
    } else return NextResponse.json({ error: "Invalid reminderAt" }, { status: 400 });
  }

  if (body.repeatSchedule !== undefined) {
    if (body.repeatSchedule === null || body.repeatSchedule === "") {
      patch.repeatSchedule = FieldValue.delete();
    } else if (typeof body.repeatSchedule === "string") {
      patch.repeatSchedule = body.repeatSchedule;
    } else return NextResponse.json({ error: "Invalid repeatSchedule" }, { status: 400 });
  }

  const nextStatus = (patch.status as Task["status"] | undefined) ?? task.status;

  if (patch.status !== undefined) {
    if (nextStatus === "done" && task.status !== "done") {
      patch.completedAt = Date.now();
    } else if (task.status === "done" && nextStatus !== "done") {
      patch.completedAt = FieldValue.delete();
    }
  }

  await ref.update(patch);

  const freshSnap = await ref.get();
  const after = { id: freshSnap.id, ...(freshSnap.data() as Omit<Task, "id">) };

  await syncInvestorFollowUpFields(db, ctx.orgId, id, after);

  revalidatePath("/tasks");
  revalidatePath("/dashboard");

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "task.update",
    resource: `${col.tasks}/${id}`,
    payload: patch,
  });

  return NextResponse.json({ ok: true, task: after });
}
