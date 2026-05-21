import type { Firestore } from "firebase-admin/firestore";
import { col } from "@/lib/firestore/paths";
import type {
  Investor,
  OutreachCampaign,
  OutreachRecipient,
  OutreachSequence,
  OutreachStep,
} from "@/lib/firestore/types";
import { getOrganization, getDeal } from "@/lib/firestore/queries";
import { sendOutreachEmail } from "@/lib/outreach/send-email";
import { assertOutreachSendAllowed } from "@/lib/outreach/entitlements";
import { resolveTemplateVariables } from "@/lib/outreach/template-vars";
import { generatePersonalizedOutreach } from "@/lib/outreach/ai-personalization";
import { getSequence, parseCampaignDoc } from "@/lib/outreach/campaign-service";
import { maybeCreateTaskFromOutreachEvent, appendCrmActivityFromOutreach } from "@/lib/outreach/tasks-hooks";
import type { OutreachEventType } from "@/lib/firestore/types";
import { computeEngagementScore } from "@/lib/outreach/analytics";

const BATCH_PER_ORG = 40;

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

async function loadDomainSettings(db: Firestore, orgId: string) {
  const snap = await db.collection(col.outreachDomainSettings).doc(orgId).get();
  return snap.exists ? snap.data() : null;
}

async function recipientEventsSince(
  db: Firestore,
  recipientId: string,
  since: number,
): Promise<{ eventType: string; createdAt: number }[]> {
  const snap = await db
    .collection(col.outreachEvents)
    .where("recipientId", "==", recipientId)
    .where("createdAt", ">=", since)
    .limit(50)
    .get();
  return snap.docs.map((d) => ({
    eventType: d.get("eventType") as string,
    createdAt: d.get("createdAt") as number,
  }));
}

function stepTriggerSatisfied(
  step: OutreachStep,
  events: { eventType: string }[],
  lastTouchAt: number | undefined,
): boolean {
  if (step.trigger === "immediate") return true;
  const since = lastTouchAt ?? 0;
  const recent = events.filter((e) => true);
  if (step.trigger === "opened") {
    return recent.some((e) => e.eventType === "email_opened");
  }
  if (step.trigger === "clicked") {
    return recent.some((e) => e.eventType === "email_clicked");
  }
  if (step.trigger === "no_response") {
    const replied = recent.some((e) => e.eventType === "email_replied");
    return !replied && Date.now() - since >= step.delayDays * 86400000;
  }
  return true;
}

type ProcessRecipientResult = {
  sent: boolean;
  skipReason?:
    | "inactive"
    | "not_due"
    | "no_org"
    | "no_investor"
    | "no_email"
    | "no_step"
    | "trigger_pending"
    | "task_advanced";
};

async function processRecipient(
  db: Firestore,
  recipient: OutreachRecipient,
  campaign: OutreachCampaign,
  sequence: OutreachSequence | null,
): Promise<ProcessRecipientResult> {
  if (recipient.status !== "active" && recipient.status !== "queued") {
    return { sent: false, skipReason: "inactive" };
  }
  if (recipient.nextTouchAt && recipient.nextTouchAt > Date.now()) {
    return { sent: false, skipReason: "not_due" };
  }

  const org = await getOrganization(campaign.organizationId);
  if (!org) return { sent: false, skipReason: "no_org" };

  const invSnap = await db.collection(col.investors).doc(recipient.investorId).get();
  if (!invSnap.exists) return { sent: false, skipReason: "no_investor" };
  const investor = { id: invSnap.id, ...invSnap.data() } as Investor;
  const email = investor.email?.trim();
  if (!email) return { sent: false, skipReason: "no_email" };

  const steps = (sequence?.steps ?? []).filter((s) => s.enabled);
  const stepIndex = recipient.currentStepIndex;
  const step = steps[stepIndex];
  if (!step) {
    return { sent: false, skipReason: "no_step" };
  }

  if (step.type === "task") {
    const nextIndex = stepIndex + 1;
    const nextStep = steps[nextIndex];
    await db.collection(col.outreachRecipients).doc(recipient.id).update({
      currentStepIndex: nextIndex,
      nextTouchAt: nextStep
        ? Date.now() + (nextStep.delayDays ?? 0) * 86400000
        : null,
      status: nextIndex >= steps.length ? "completed" : "active",
      updatedAt: Date.now(),
    });
    return { sent: false, skipReason: "task_advanced" };
  }

  const events = await recipientEventsSince(db, recipient.id, recipient.lastTouchAt ?? 0);
  if (!stepTriggerSatisfied(step, events, recipient.lastTouchAt)) {
    await db.collection(col.outreachRecipients).doc(recipient.id).update({
      nextTouchAt: Date.now() + 86400000,
      updatedAt: Date.now(),
    });
    return { sent: false, skipReason: "trigger_pending" };
  }

  const allowed = await assertOutreachSendAllowed(db, campaign.organizationId);
  if (!allowed.ok) {
    throw new Error(allowed.message);
  }

  const deal = campaign.relatedDealId
    ? await getDeal(campaign.organizationId, campaign.relatedDealId)
    : null;

  let subject = step.subjectTemplate ?? "Following up";
  let bodyHtml = step.bodyTemplate ?? "<p>Following up on our conversation.</p>";

  if (step.aiPersonalized) {
    try {
      const personalized = await generatePersonalizedOutreach({
        investor,
        organization: org,
        deal,
        subjectTemplate: step.subjectTemplate,
        bodyTemplate: step.bodyTemplate,
      });
      subject = personalized.subject;
      bodyHtml = personalized.bodyHtml;
    } catch (e) {
      console.error("[outreach-engine] AI personalize failed", e);
    }
  }

  const ctx = { investor, organization: org, deal, sponsorName: org.name };
  subject = resolveTemplateVariables(subject, ctx);
  bodyHtml = resolveTemplateVariables(bodyHtml, ctx);

  const domainSettings = await loadDomainSettings(db, campaign.organizationId);
  await sendOutreachEmail({
    db,
    organizationId: campaign.organizationId,
    organization: org,
    domainSettings: domainSettings as Parameters<typeof sendOutreachEmail>[0]["domainSettings"],
    to: email,
    subject,
    html: bodyHtml,
    campaignId: campaign.id,
    investorId: investor.id,
    recipientId: recipient.id,
    stepIndex,
    sequenceStepId: step.id,
    baseUrl: getBaseUrl(),
  });

  const nextIndex = stepIndex + 1;
  const nextStep = steps[nextIndex];
  const now = Date.now();
  await db.collection(col.outreachRecipients).doc(recipient.id).update({
    currentStepIndex: nextIndex,
    lastTouchAt: now,
    nextTouchAt: nextStep ? now + (nextStep.delayDays ?? 0) * 86400000 : null,
    status: nextIndex >= steps.length ? "completed" : "active",
    updatedAt: now,
  });

  const eventSnap = await db
    .collection(col.outreachEvents)
    .where("recipientId", "==", recipient.id)
    .limit(30)
    .get();
  const score = computeEngagementScore(
    eventSnap.docs.map((d) => ({ eventType: d.get("eventType") })),
  );
  await db.collection(col.outreachRecipients).doc(recipient.id).update({ engagementScore: score });
  return { sent: true };
}

function recipientNeverEmailed(recipient: OutreachRecipient): boolean {
  return recipient.status === "completed" && !recipient.lastTouchAt;
}

async function reactivateRecipientForSequence(
  db: Firestore,
  recipientId: string,
  nextTouchAt: number,
): Promise<void> {
  await db.collection(col.outreachRecipients).doc(recipientId).update({
    status: "active",
    currentStepIndex: 0,
    nextTouchAt,
    updatedAt: Date.now(),
  });
}

export type OutreachCampaignProcessResult = {
  processed: number;
  emailsSent: number;
  skippedNotDue: number;
  reactivated: number;
  totalRecipients: number;
  errors: string[];
  blockedReason?: "NO_SEQUENCE" | "NO_ENABLED_STEPS" | "RESEND_NOT_CONFIGURED";
  durationMs: number;
  sequenceAttached: boolean;
  sequenceStepCount: number;
};

export async function processOutreachQueueForCampaign(
  db: Firestore,
  organizationId: string,
  campaignId: string,
): Promise<OutreachCampaignProcessResult> {
  const start = Date.now();
  const empty = (partial?: Partial<OutreachCampaignProcessResult>): OutreachCampaignProcessResult => ({
    processed: 0,
    emailsSent: 0,
    skippedNotDue: 0,
    reactivated: 0,
    totalRecipients: 0,
    errors: [],
    durationMs: Date.now() - start,
    sequenceAttached: false,
    sequenceStepCount: 0,
    ...partial,
  });

  const campaignSnap = await db.collection(col.campaigns).doc(campaignId).get();
  if (!campaignSnap.exists) return empty();
  const campaign = parseCampaignDoc(campaignSnap.id, campaignSnap.data()!);
  if (campaign.organizationId !== organizationId || campaign.status !== "active") {
    return empty();
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return empty({
      blockedReason: "RESEND_NOT_CONFIGURED",
      totalRecipients: 0,
    });
  }

  const sequence = campaign.sequenceId
    ? await getSequence(db, organizationId, campaign.sequenceId)
    : null;
  const steps = (sequence?.steps ?? []).filter((s) => s.enabled);
  const now = Date.now();
  const firstStep = steps[0];
  const defaultNextTouchAt =
    firstStep?.trigger === "immediate" || !firstStep
      ? now
      : now + (firstStep.delayDays ?? 0) * 86400000;

  const snap = await db
    .collection(col.outreachRecipients)
    .where("campaignId", "==", campaignId)
    .limit(BATCH_PER_ORG)
    .get();

  const totalRecipients = snap.size;

  if (!campaign.sequenceId) {
    return empty({ blockedReason: "NO_SEQUENCE", totalRecipients });
  }
  if (steps.length === 0) {
    return empty({ blockedReason: "NO_ENABLED_STEPS", totalRecipients, sequenceAttached: true });
  }

  let processed = 0;
  let emailsSent = 0;
  let skippedNotDue = 0;
  let reactivated = 0;
  const errors: string[] = [];

  for (const doc of snap.docs) {
    let recipient = { ...(doc.data() as OutreachRecipient), id: doc.id };

    if (recipientNeverEmailed(recipient)) {
      await reactivateRecipientForSequence(db, doc.id, defaultNextTouchAt);
      recipient = {
        ...recipient,
        status: "active",
        currentStepIndex: 0,
        nextTouchAt: defaultNextTouchAt,
      };
      reactivated += 1;
    }

    if (recipient.status !== "active" && recipient.status !== "queued") {
      continue;
    }

    if (recipient.nextTouchAt && recipient.nextTouchAt > now) {
      skippedNotDue += 1;
      continue;
    }

    try {
      const result = await processRecipient(db, recipient, campaign, sequence);
      processed += 1;
      if (result.sent) emailsSent += 1;
      else if (result.skipReason === "not_due") skippedNotDue += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(msg);
      console.error("[outreach-engine] recipient failed", doc.id, e);
    }
  }

  return {
    processed,
    emailsSent,
    skippedNotDue,
    reactivated,
    totalRecipients,
    errors,
    durationMs: Date.now() - start,
    sequenceAttached: Boolean(sequence),
    sequenceStepCount: steps.length,
  };
}

export async function processOutreachQueueForOrg(
  db: Firestore,
  organizationId: string,
): Promise<{ processed: number }> {
  const now = Date.now();
  const snap = await db
    .collection(col.outreachRecipients)
    .where("organizationId", "==", organizationId)
    .where("status", "in", ["active", "queued"])
    .where("nextTouchAt", "<=", now)
    .limit(BATCH_PER_ORG)
    .get();

  let processed = 0;
  for (const doc of snap.docs) {
    const recipient = doc.data() as OutreachRecipient;
    const campaignSnap = await db.collection(col.campaigns).doc(recipient.campaignId).get();
    if (!campaignSnap.exists) continue;
    const campaign = parseCampaignDoc(campaignSnap.id, campaignSnap.data()!);
    if (campaign.status !== "active") continue;

    const sequence = campaign.sequenceId
      ? await getSequence(db, organizationId, campaign.sequenceId)
      : null;

    try {
      await processRecipient(db, { ...recipient, id: doc.id }, campaign, sequence);
      processed += 1;
    } catch (e) {
      console.error("[outreach-engine] recipient failed", doc.id, e);
    }
  }
  return { processed };
}

export async function processOutreachQueueAllOrgs(db: Firestore): Promise<number> {
  const campaignsSnap = await db
    .collection(col.campaigns)
    .where("status", "==", "active")
    .limit(50)
    .get();

  const orgIds = new Set<string>();
  for (const doc of campaignsSnap.docs) {
    orgIds.add(doc.get("organizationId") as string);
  }

  let total = 0;
  for (const orgId of orgIds) {
    const { processed } = await processOutreachQueueForOrg(db, orgId);
    total += processed;
  }
  return total;
}

export async function handleOutreachEventSideEffects(
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
  await maybeCreateTaskFromOutreachEvent(db, input);
  await appendCrmActivityFromOutreach(db, {
    organizationId: input.organizationId,
    investorId: input.investorId,
    dealId: input.relatedDealId,
    summary: `Outreach: ${input.eventType.replace(/_/g, " ")}`,
    eventType: input.eventType,
  });
}
