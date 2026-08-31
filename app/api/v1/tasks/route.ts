import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { rejectForbiddenApiActions } from "@/lib/api/v1/guards";
import { v1BadRequest, v1Forbidden, v1Json } from "@/lib/api/v1/responses";
import { serializeTask } from "@/lib/api/v1/serialize";
import { isTaskPriority, isTaskType, isWorkflow } from "@/lib/api/v1/task-body";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { listTasksForOrganization } from "@/lib/firestore/queries";
import type { Task } from "@/lib/firestore/types";

export async function GET(req: NextRequest) {
  return withApiKeyAuth(req, async (ctx) => {
    const tasks = await listTasksForOrganization(ctx.orgId);
    return v1Json({ tasks: tasks.map(serializeTask) });
  });
}

export async function POST(req: NextRequest) {
  return withApiKeyAuth(req, async (ctx) => {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return v1BadRequest("Invalid JSON body");
    }

    const forbidden = rejectForbiddenApiActions(body);
    if (!forbidden.ok) return v1Forbidden(forbidden.message);

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return v1BadRequest("title is required");

    const dueAt =
      typeof body.dueAt === "number" && body.dueAt > 0 ? body.dueAt : Date.now() + 7 * 86400000;

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
      createdByUserId: ctx.actorId,
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
    if (isWorkflow(body.workflowStatus)) payload.workflowStatus = body.workflowStatus;
    if (isTaskPriority(body.taskPriority)) payload.taskPriority = body.taskPriority;
    if (isTaskType(body.taskType)) payload.taskType = body.taskType;
    if (typeof body.reminderAt === "number" && body.reminderAt > 0) payload.reminderAt = body.reminderAt;

    const db = getAdminFirestore();
    await db.collection(col.tasks).doc(id).set(payload);

    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.actorId,
      action: "task.create.api",
      resource: `${col.tasks}/${id}`,
      payload: { title },
    });

    const task = { id, ...(payload as Omit<Task, "id">) };
    return v1Json({ task: serializeTask(task) }, 201);
  });
}
