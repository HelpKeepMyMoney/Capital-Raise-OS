import { randomUUID } from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { col } from "@/lib/firestore/paths";
import type { OutreachEventType } from "@/lib/firestore/types";

const METRIC_FIELD: Partial<Record<OutreachEventType, string>> = {
  email_sent: "sent",
  email_opened: "opened",
  email_clicked: "clicked",
  email_replied: "replied",
  meeting_booked: "meetingsBooked",
  data_room_viewed: "dataRoomVisits",
};

const LEGACY_STATS_FIELD: Partial<Record<OutreachEventType, string>> = {
  email_sent: "sent",
  email_opened: "opened",
  email_clicked: "clicked",
  email_replied: "replied",
};

export async function recordOutreachEvent(
  db: Firestore,
  input: {
    organizationId: string;
    campaignId: string;
    recipientId: string;
    investorId: string;
    eventType: OutreachEventType;
    touchId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<string> {
  const id = randomUUID();
  const now = Date.now();

  await db.collection(col.outreachEvents).doc(id).set({
    id,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    recipientId: input.recipientId,
    investorId: input.investorId,
    touchId: input.touchId ?? null,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    createdAt: now,
  });

  const metricKey = METRIC_FIELD[input.eventType];
  if (metricKey) {
    const patch: Record<string, unknown> = {
      [`metrics.${metricKey}`]: FieldValue.increment(1),
      updatedAt: now,
    };
    const legacyKey = LEGACY_STATS_FIELD[input.eventType];
    if (legacyKey) {
      patch[`stats.${legacyKey}`] = FieldValue.increment(1);
    }
    await db.collection(col.campaigns).doc(input.campaignId).update(patch).catch(() => {});
  }

  const recipientPatch: Record<string, unknown> = { updatedAt: now };
  if (input.eventType === "email_opened") recipientPatch.opened = true;
  if (input.eventType === "email_clicked") recipientPatch.clicked = true;
  if (input.eventType === "email_replied") recipientPatch.replied = true;

  await db
    .collection(col.outreachRecipients)
    .doc(input.recipientId)
    .update(recipientPatch)
    .catch(() => {});

  return id;
}
