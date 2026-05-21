import type { Firestore } from "firebase-admin/firestore";
import { col } from "@/lib/firestore/paths";
import { recordOutreachEvent } from "@/lib/outreach/events";
import { handleOutreachEventSideEffects } from "@/lib/outreach/engine";

/**
 * When an investor views a data room document, link to active outreach campaigns.
 */
export async function bridgeDataRoomViewToOutreach(
  db: Firestore,
  input: {
    organizationId: string;
    investorId?: string;
    dealId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!input.investorId) return;

  const campaignsSnap = await db
    .collection(col.campaigns)
    .where("organizationId", "==", input.organizationId)
    .where("status", "==", "active")
    .limit(10)
    .get();

  for (const cDoc of campaignsSnap.docs) {
    const campaign = cDoc.data();
    if (input.dealId && campaign.relatedDealId && campaign.relatedDealId !== input.dealId) {
      continue;
    }

    const recipientSnap = await db
      .collection(col.outreachRecipients)
      .where("campaignId", "==", cDoc.id)
      .where("investorId", "==", input.investorId)
      .where("status", "in", ["active", "completed"])
      .limit(1)
      .get();

    if (recipientSnap.empty) continue;
    const recipient = recipientSnap.docs[0]!;

    await recordOutreachEvent(db, {
      organizationId: input.organizationId,
      campaignId: cDoc.id,
      recipientId: recipient.id,
      investorId: input.investorId,
      eventType: "data_room_viewed",
      metadata: input.metadata,
    });

    await handleOutreachEventSideEffects(db, {
      organizationId: input.organizationId,
      campaignId: cDoc.id,
      recipientId: recipient.id,
      investorId: input.investorId,
      eventType: "data_room_viewed",
      relatedDealId: input.dealId,
    });
    break;
  }
}
