import { z } from "zod";

export const UserRoleSchema = z.enum([
  "admin",
  "founder",
  "fund_manager",
  "analyst",
  "assistant",
  "investor_guest",
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const PipelineStageSchema = z.enum([
  "lead",
  "researching",
  "contacted",
  "responded",
  "meeting_scheduled",
  "data_room_opened",
  "due_diligence",
  "soft_circled",
  "committed",
  "closed",
  "declined",
]);
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const InvestorTypeSchema = z.enum([
  "angel",
  "vc",
  "family_office",
  "fund_of_funds",
  "corporate",
  "accelerator",
  "real_estate_lp",
  "high_net_worth",
  "institutional",
  "other",
]);
export type InvestorType = z.infer<typeof InvestorTypeSchema>;

export const WarmColdSchema = z.enum(["warm", "cold"]);
export type WarmCold = z.infer<typeof WarmColdSchema>;

export const DealTypeSchema = z.enum([
  "startup_equity",
  "safe",
  "convertible_note",
  "real_estate_syndication",
  "lp_fund",
  "revenue_share",
  "private_bond",
]);
export type DealType = z.infer<typeof DealTypeSchema>;

export const DealStatusSchema = z.enum([
  "draft",
  "active",
  "closing",
  "closed",
  "cancelled",
]);
export type DealStatus = z.infer<typeof DealStatusSchema>;

export const SubscriptionPlanSchema = z.enum([
  "starter",
  "pro",
  "capital_team",
  "enterprise",
  "none",
]);
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

export type OrgSubscription = {
  plan: SubscriptionPlan;
  status: "active" | "trialing" | "past_due" | "cancelled" | "none";
  paypalSubscriptionId?: string;
  currentPeriodEnd?: number;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
  settings?: {
    defaultNdaRequired?: boolean;
    emailFromName?: string;
  };
  subscription?: OrgSubscription;
  createdAt: number;
};

export type OrganizationMember = {
  organizationId: string;
  userId: string;
  role: UserRole;
  joinedAt: number;
  invitedBy?: string;
};

export type UserDoc = {
  email: string;
  displayName?: string;
  photoURL?: string;
  defaultOrganizationId?: string;
  twoFactorEnabled?: boolean;
  createdAt: number;
};

export type Investor = {
  id: string;
  organizationId: string;
  name: string;
  firm?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedIn?: string;
  location?: string;
  investorType?: InvestorType;
  checkSizeMin?: number;
  checkSizeMax?: number;
  preferredSectors?: string[];
  preferredGeography?: string[];
  stagePreference?: string[];
  warmCold?: WarmCold;
  relationshipScore?: number;
  lastContactAt?: number;
  nextFollowUpAt?: number;
  notesSummary?: string;
  documentsSharedCount?: number;
  pipelineStage: PipelineStage;
  committedAmount?: number;
  createdAt: number;
  updatedAt: number;
};

export type Task = {
  id: string;
  organizationId: string;
  title: string;
  assigneeId?: string;
  dueAt?: number;
  status: "open" | "done" | "cancelled";
  linkedInvestorId?: string;
  linkedDealId?: string;
  createdAt: number;
};

export type Activity = {
  id: string;
  organizationId: string;
  investorId?: string;
  type: string;
  summary: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
};

export type Meeting = {
  id: string;
  organizationId: string;
  investorId?: string;
  title: string;
  startsAt: number;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: number;
};

export type Campaign = {
  id: string;
  organizationId: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
  };
  createdAt: number;
};

export type EmailTemplate = {
  id: string;
  organizationId: string;
  name: string;
  subject: string;
  bodyHtml: string;
  createdAt: number;
};

export type OutreachEmail = {
  id: string;
  organizationId: string;
  campaignId?: string;
  investorId?: string;
  resendMessageId?: string;
  subject: string;
  status: "queued" | "sent" | "delivered" | "bounced" | "failed";
  openCount?: number;
  clickCount?: number;
  replySentiment?: "positive" | "neutral" | "negative" | "unknown";
  sentAt?: number;
  createdAt: number;
};

export type Deal = {
  id: string;
  organizationId: string;
  name: string;
  type: DealType;
  targetRaise?: number;
  minimumInvestment?: number;
  valuation?: number;
  terms?: string;
  useOfProceeds?: string;
  closeDate?: number;
  status: DealStatus;
  createdAt: number;
};

export type DataRoom = {
  id: string;
  organizationId: string;
  dealId?: string;
  name: string;
  ndaRequired: boolean;
  createdAt: number;
};

export type RoomDocument = {
  id: string;
  organizationId: string;
  dataRoomId: string;
  name: string;
  storagePath: string;
  kind: "deck" | "model" | "ppm" | "video" | "legal" | "other";
  viewCount?: number;
  totalViewSeconds?: number;
  createdAt: number;
};

export type AuditLog = {
  id: string;
  organizationId: string;
  actorId: string;
  action: string;
  resource: string;
  payload?: Record<string, unknown>;
  createdAt: number;
};
