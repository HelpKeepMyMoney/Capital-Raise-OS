import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { rejectForbiddenApiActions } from "@/lib/api/v1/guards";
import { v1BadRequest, v1Forbidden, v1Json, v1NotFound } from "@/lib/api/v1/responses";
import { serializeTask } from "@/lib/api/v1/serialize";
import { isTaskPriority, isTaskStatus, isTaskType, isWorkflow } from "@/lib/api/v1/task-body";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getTask } from "@/lib/firestore/queries";
import type { Task } from "@/lib/firestore/types";

export async function GET(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    const { id } = await routeCtx.params;
    const task = await getTask(ctx.orgId, id);
    if (!task) return v1NotFound("Task");
    return v1Json({ task: serializeTask(task) });
  });
}

export async function PATCH(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    const { id } = await routeCtx.params;
    const task = await getTask(ctx.orgId, id);
    if (!task) return v1NotFound("Task");

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return v1BadRequest("Invalid JSON body");
    }

    const forbidden = rejectForbiddenApiActions(body);
    if (!forbidden.ok) return v1Forbidden(forbidden.message);

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        return v1BadRequest("Invalid title");
      }
      patch.title = body.title.trim();
    }

    if (body.status !== undefined) {
      if (!isTaskStatus(body.status)) return v1BadRequest("Invalid status");
      patch.status = body.status;
    }

    if (body.dueAt !== undefined) {
      if (body.dueAt === null) patch.dueAt = FieldValue.delete();
      else if (typeof body.dueAt === "number" && body.dueAt > 0) patch.dueAt = body.dueAt;
      else return v1BadRequest("Invalid dueAt");
    }

    const optionalId = (key: string, value: unknown) => {
      if (value === null || value === "") patch[key] = FieldValue.delete();
      else if (typeof value === "string" && value.trim()) patch[key] = value.trim();
      else return false;
      return true;
    };

    if (body.assigneeId !== undefined && !optionalId("assigneeId", body.assigneeId)) {
      return v1BadRequest("Invalid assigneeId");
    }
    if (body.linkedInvestorId !== undefined && !optionalId("linkedInvestorId", body.linkedInvestorId)) {
      return v1BadRequest("Invalid linkedInvestorId");
    }
    if (body.linkedDealId !== undefined && !optionalId("linkedDealId", body.linkedDealId)) {
      return v1BadRequest("Invalid linkedDealId");
    }
    if (body.linkedDataRoomId !== undefined && !optionalId("linkedDataRoomId", body.linkedDataRoomId)) {
      return v1BadRequest("Invalid linkedDataRoomId");
    }

    if (body.workflowStatus !== undefined) {
      if (body.workflowStatus === null || body.workflowStatus === "") patch.workflowStatus = FieldValue.delete();
      else if (isWorkflow(body.workflowStatus)) patch.workflowStatus = body.workflowStatus;
      else return v1BadRequest("Invalid workflowStatus");
    }
    if (body.taskPriority !== undefined) {
      if (body.taskPriority === null || body.taskPriority === "") patch.taskPriority = FieldValue.delete();
      else if (isTaskPriority(body.taskPriority)) patch.taskPriority = body.taskPriority;
      else return v1BadRequest("Invalid taskPriority");
    }
    if (body.taskType !== undefined) {
      if (body.taskType === null || body.taskType === "") patch.taskType = FieldValue.delete();
      else if (isTaskType(body.taskType)) patch.taskType = body.taskType;
      else return v1BadRequest("Invalid taskType");
    }
    if (body.description !== undefined) {
      if (body.description === null || body.description === "") patch.description = FieldValue.delete();
      else if (typeof body.description === "string") patch.description = body.description;
      else return v1BadRequest("Invalid description");
    }
    if (body.notes !== undefined) {
      if (body.notes === null || body.notes === "") patch.notes = FieldValue.delete();
      else if (typeof body.notes === "string") patch.notes = body.notes;
      else return v1BadRequest("Invalid notes");
    }
    if (body.reminderAt !== undefined) {
      if (body.reminderAt === null) patch.reminderAt = FieldValue.delete();
      else if (typeof body.reminderAt === "number" && body.reminderAt > 0) patch.reminderAt = body.reminderAt;
      else return v1BadRequest("Invalid reminderAt");
    }

    const nextStatus = (patch.status as Task["status"] | undefined) ?? task.status;
    if (patch.status !== undefined) {
      if (nextStatus === "done" && task.status !== "done") patch.completedAt = Date.now();
      else if (task.status === "done" && nextStatus !== "done") patch.completedAt = FieldValue.delete();
    }

    const db = getAdminFirestore();
    await db.collection(col.tasks).doc(id).update(patch);

    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.actorId,
      action: "task.update.api",
      resource: `${col.tasks}/${id}`,
      payload: { keys: Object.keys(body) },
    });

    const updated = await getTask(ctx.orgId, id);
    if (!updated) return v1NotFound("Task");
    return v1Json({ task: serializeTask(updated) });
  });
}
