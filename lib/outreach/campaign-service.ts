import { randomUUID } from "crypto";
import type { DocumentData, Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { col } from "@/lib/firestore/paths";
import type {
  Investor,
  OutreachCampaign,
  OutreachRecipient,
  OutreachSequence,
} from "@/lib/firestore/types";
import { applyAudienceFilters } from "@/lib/outreach/segmentation";
import { defaultCampaignMetrics } from "@/lib/outreach/schemas";
import { metricsToLegacyStats, normalizeCampaignMetrics } from "@/lib/outreach/metrics-helpers";
import type { CreateCampaignSchema, UpdateCampaignSchema } from "@/lib/outreach/schemas";
import type { z } from "zod";

export function parseCampaignDoc(id: string, data: DocumentData): OutreachCampaign {
  const metrics = normalizeCampaignMetrics(data as OutreachCampaign);
  return {
    id,
    organizationId: data.organizationId as string,
    name: data.name as string,
    description: data.description as string | undefined,
    status: (data.status as OutreachCampaign["status"]) ?? "draft",
    campaignType: (data.campaignType as OutreachCampaign["campaignType"]) ?? "general",
    relatedDealId: data.relatedDealId as string | undefined,
    sequenceId: data.sequenceId as string | undefined,
    audienceFilters: (data.audienceFilters as OutreachCampaign["audienceFilters"]) ?? {},
    metrics,
    stats: metricsToLegacyStats(metrics),
    startedAt: data.startedAt as number | undefined,
    completedAt: data.completedAt as number | undefined,
    createdAt: (data.createdAt as number) ?? 0,
    updatedAt: (data.updatedAt as number) ?? (data.createdAt as number) ?? 0,
    createdByUid: (data.createdByUid as string) ?? "",
  };
}

export async function createCampaign(
  db: Firestore,
  orgId: string,
  uid: string,
  input: z.infer<typeof CreateCampaignSchema>,
): Promise<OutreachCampaign> {
  const id = randomUUID();
  const now = Date.now();
  const metrics = defaultCampaignMetrics();
  const doc = {
    id,
    organizationId: orgId,
    name: input.name,
    description: input.description ?? null,
    status: "draft" as const,
    campaignType: input.campaignType,
    relatedDealId: input.relatedDealId ?? null,
    sequenceId: input.sequenceId ?? null,
    audienceFilters: input.audienceFilters,
    metrics,
    stats: metricsToLegacyStats(metrics),
    createdAt: now,
    updatedAt: now,
    createdByUid: uid,
  };
  await db.collection(col.campaigns).doc(id).set(doc);
  return parseCampaignDoc(id, doc);
}

export async function updateCampaign(
  db: Firestore,
  orgId: string,
  campaignId: string,
  input: z.infer<typeof UpdateCampaignSchema>,
): Promise<OutreachCampaign | null> {
  const ref = db.collection(col.campaigns).doc(campaignId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const existing = snap.data()!;
  if (existing.organizationId !== orgId) return null;

  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.campaignType !== undefined) patch.campaignType = input.campaignType;
  if (input.relatedDealId !== undefined) patch.relatedDealId = input.relatedDealId;
  if (input.sequenceId !== undefined) patch.sequenceId = input.sequenceId;
  if (input.audienceFilters !== undefined) patch.audienceFilters = input.audienceFilters;
  if (input.status !== undefined) {
    patch.status = input.status;
    if (input.status === "active" && !existing.startedAt) patch.startedAt = Date.now();
    if (input.status === "completed") patch.completedAt = Date.now();
  }

  await ref.update(patch);

  if (input.status === "active") {
    await enrollCampaignRecipients(db, orgId, campaignId, []);
  }

  const updated = await ref.get();
  return parseCampaignDoc(campaignId, updated.data()!);
}

export async function enrollCampaignRecipients(
  db: Firestore,
  orgId: string,
  campaignId: string,
  investors: Investor[],
): Promise<number> {
  const campaignRef = db.collection(col.campaigns).doc(campaignId);
  const campaignSnap = await campaignRef.get();
  if (!campaignSnap.exists) return 0;
  const campaign = campaignSnap.data()!;
  if (campaign.organizationId !== orgId) return 0;

  let audience = investors;
  if (!audience.length) {
    const invSnap = await db.collection(col.investors).where("organizationId", "==", orgId).limit(500).get();
    audience = invSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Investor);
  }

  const filters = (campaign.audienceFilters ?? {}) as OutreachCampaign["audienceFilters"];
  const matched = applyAudienceFilters(audience, filters);
  if (!matched.length) return 0;

  const sequenceSnap = campaign.sequenceId
    ? await db.collection(col.outreachSequences).doc(campaign.sequenceId as string).get()
    : null;
  const sequence = sequenceSnap?.exists
    ? (sequenceSnap.data() as OutreachSequence)
    : null;
  const firstStep = sequence?.steps?.find((s) => s.enabled);
  const now = Date.now();
  const nextTouchAt =
    firstStep?.trigger === "immediate" || !firstStep
      ? now
      : now + (firstStep.delayDays ?? 0) * 86400000;

  const existingSnap = await db
    .collection(col.outreachRecipients)
    .where("campaignId", "==", campaignId)
    .limit(500)
    .get();
  const existingInvestorIds = new Set(
    existingSnap.docs.map((d) => d.get("investorId") as string),
  );

  const batch = db.batch();
  let enrolled = 0;
  for (const inv of matched) {
    if (existingInvestorIds.has(inv.id)) continue;
    const recipientId = randomUUID();
    const recipient: OutreachRecipient = {
      id: recipientId,
      organizationId: orgId,
      campaignId,
      investorId: inv.id,
      status: "active",
      currentStepIndex: 0,
      nextTouchAt,
      engagementScore: 0,
      opened: false,
      clicked: false,
      replied: false,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(db.collection(col.outreachRecipients).doc(recipientId), recipient);
    enrolled += 1;
  }

  await batch.commit();
  await campaignRef.update({
    "metrics.recipients": FieldValue.increment(enrolled),
    updatedAt: now,
  });
  return enrolled;
}

export async function getSequence(
  db: Firestore,
  orgId: string,
  sequenceId: string,
): Promise<OutreachSequence | null> {
  const snap = await db.collection(col.outreachSequences).doc(sequenceId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (data.organizationId !== orgId) return null;
  return { id: snap.id, ...data } as OutreachSequence;
}
