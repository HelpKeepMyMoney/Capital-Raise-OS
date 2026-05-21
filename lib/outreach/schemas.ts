import { z } from "zod";

/** Firestore document ids (UUID or auto-generated). */
const FirestoreDocIdSchema = z.string().min(1).max(128);

export const OutreachCampaignStatusSchema = z.enum(["draft", "active", "paused", "completed"]);
export const OutreachCampaignTypeSchema = z.enum([
  "capital_raise",
  "lp_relations",
  "strategic_partnership",
  "general",
]);

export const OutreachAudienceFiltersSchema = z.object({
  investorIds: z.array(z.string().min(1)).max(500).optional(),
  investorTypes: z.array(z.string()).optional(),
  sectors: z.array(z.string()).optional(),
  geography: z.array(z.string()).optional(),
  minimumRelationshipScore: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  dealIds: z.array(z.string()).optional(),
  pipelineStages: z.array(z.string()).optional(),
});

export const OutreachStepSchema = z.object({
  id: FirestoreDocIdSchema.optional(),
  type: z.enum(["email", "task"]),
  delayDays: z.number().int().min(0).max(365),
  subjectTemplate: z.string().max(500).optional(),
  bodyTemplate: z.string().max(50_000).optional(),
  aiPersonalized: z.boolean(),
  trigger: z.enum(["immediate", "opened", "clicked", "no_response"]),
  enabled: z.boolean(),
});

export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  campaignType: OutreachCampaignTypeSchema.default("general"),
  relatedDealId: FirestoreDocIdSchema.optional(),
  sequenceId: FirestoreDocIdSchema.optional(),
  audienceFilters: OutreachAudienceFiltersSchema.default({}),
});

export const UpdateCampaignSchema = CreateCampaignSchema.partial().extend({
  status: OutreachCampaignStatusSchema.optional(),
});

export const CreateSequenceSchema = z.object({
  name: z.string().min(1).max(200),
  steps: z.array(OutreachStepSchema).default([]),
  status: z.enum(["draft", "active", "paused"]).default("draft"),
});

export const UpdateSequenceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  steps: z.array(OutreachStepSchema).optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
});

export const SendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(500),
  html: z.string().min(1).max(100_000),
  text: z.string().max(100_000).optional(),
  campaignId: FirestoreDocIdSchema.optional(),
  investorId: FirestoreDocIdSchema.optional(),
  recipientId: FirestoreDocIdSchema.optional(),
  replyTo: z.string().email().optional(),
});

export const RecordEventSchema = z.object({
  campaignId: FirestoreDocIdSchema,
  recipientId: FirestoreDocIdSchema,
  investorId: FirestoreDocIdSchema,
  eventType: z.enum([
    "email_sent",
    "email_opened",
    "email_clicked",
    "email_replied",
    "meeting_booked",
    "data_room_viewed",
  ]),
  touchId: FirestoreDocIdSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const PersonalizePreviewSchema = z.object({
  investorId: FirestoreDocIdSchema,
  dealId: FirestoreDocIdSchema.optional(),
  subjectTemplate: z.string().max(500).optional(),
  bodyTemplate: z.string().max(50_000).optional(),
});

export const defaultCampaignMetrics = () => ({
  recipients: 0,
  sent: 0,
  opened: 0,
  replied: 0,
  clicked: 0,
  meetingsBooked: 0,
  dataRoomVisits: 0,
  bounced: 0,
});
