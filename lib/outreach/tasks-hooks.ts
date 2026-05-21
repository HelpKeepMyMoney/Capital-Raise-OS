import { createHash, randomUUID } from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import { col } from "@/lib/firestore/paths";
import type { OutreachEventType, TaskType } from "@/lib/firestore/types";

function sourceEventId(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

export async function maybeCreateTaskFromOutreachEvent(
  db: Firestore,
  input: {
    organizationId: string;
    campaignId: string;
    recipientId: string;
    investorId: string;
    eventType: OutreachEventType;
    relatedDealId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const invSnap = await db.collection(col.investors).doc(input.investorId).get();
  if (!invSnap.exists) return;
  const inv = invSnap.data()!;
  const assigneeId = (inv.relationshipOwnerUserId as string) || undefined;
  const dealId = input.relatedDealId;

  let title: string | null = null;
  let taskType: TaskType = "follow_up";

  if (input.eventType === "email_clicked") {
    title = `Investor clicked outreach link — ${inv.name ?? "investor"}`;
    taskType = "send_docs";
  } else if (input.eventType === "data_room_viewed") {
    title = `Investor revisited data room — warm follow-up`;
    taskType = "follow_up";
  }

  if (input.eventType === "email_opened") {
    const weekAgo = Date.now() - 7 * 86400000;
    const opensSnap = await db
      .collection(col.outreachEvents)
      .where("recipientId", "==", input.recipientId)
      .where("eventType", "==", "email_opened")
      .where("createdAt", ">=", weekAgo)
      .limit(10)
      .get();
    if (opensSnap.size >= 3) {
      title = `High email engagement (3+ opens) — ${inv.name ?? "investor"}`;
    }
  }

  if (!title) return;

  const sid = sourceEventId([input.eventType, input.recipientId, title]);
  const existing = await db
    .collection(col.tasks)
    .where("organizationId", "==", input.organizationId)
    .where("sourceEventId", "==", sid)
    .limit(1)
    .get();
  if (!existing.empty) return;

  const now = Date.now();
  const taskId = randomUUID();
  await db.collection(col.tasks).doc(taskId).set({
    id: taskId,
    organizationId: input.organizationId,
    title,
    status: "open",
    dueAt: now + 3 * 86400000,
    assigneeId: assigneeId ?? null,
    linkedInvestorId: input.investorId,
    linkedDealId: dealId ?? null,
    taskType,
    workflowStatus: "not_started",
    taskPriority: "medium",
    sourceEventId: sid,
    createdAt: now,
    updatedAt: now,
  });
}

export async function appendCrmActivityFromOutreach(
  db: Firestore,
  input: {
    organizationId: string;
    investorId: string;
    dealId?: string;
    summary: string;
    eventType: OutreachEventType;
  },
): Promise<void> {
  const highSignal: OutreachEventType[] = [
    "email_replied",
    "meeting_booked",
    "data_room_viewed",
  ];
  if (!highSignal.includes(input.eventType)) return;

  const id = randomUUID();
  const now = Date.now();
  await db.collection(col.activities).doc(id).set({
    id,
    organizationId: input.organizationId,
    investorId: input.investorId,
    dealId: input.dealId ?? null,
    type: `outreach.${input.eventType}`,
    summary: input.summary,
    metadata: { source: "outreach" },
    createdAt: now,
  });

  await db
    .collection(col.investors)
    .doc(input.investorId)
    .update({ lastContactAt: now, updatedAt: now })
    .catch(() => {});
}
