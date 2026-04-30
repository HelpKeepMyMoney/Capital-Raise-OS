import { z } from "zod";

export const UserRoleSchema = z.enum([
  "admin",
  "founder",
  "fund_manager",
  "analyst",
  "assistant",
  "investor_guest",
  "sponsor",
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

export const InvestorCrmStatusSchema = z.enum(["active", "archived"]);
export type InvestorCrmStatus = z.infer<typeof InvestorCrmStatusSchema>;

/** Logged on activities when recording CRM touchpoints. */
export const InvestorInteractionTypeSchema = z.enum([
  "call",
  "email",
  "meeting",
  "note",
  "other",
]);
export type InvestorInteractionType = z.infer<typeof InvestorInteractionTypeSchema>;

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

/** Comp `client`: same entitlement limits as Pro; no PayPal plan — assigned by admins for BNIC Network / HKMM clients. */
export const SubscriptionPlanSchema = z.enum([
  "starter",
  "pro",
  "client",
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
  /** Native e-sign: `SignableTemplate` id for LP subscription packet PDF. */
  subscriptionSignableTemplateId?: string | null;
  settings?: {
    defaultNdaRequired?: boolean;
    emailFromName?: string;
  };
  subscription?: OrgSubscription;
  createdAt: number;
};

/** Set for `investor_guest` at invite redemption; omit for staff. */
export type InvestorAccess =
  | { scope: "org" }
  | { scope: "deal"; dealIds: string[]; dataRoomIds: string[] };

export type OrganizationMember = {
  organizationId: string;
  userId: string;
  role: UserRole;
  joinedAt: number;
  invitedBy?: string;
  investorAccess?: InvestorAccess;
};

export type InvestorInviteScope = "org" | "deal";

export type InvestorInvitation = {
  id: string;
  organizationId: string;
  tokenHash: string;
  scope: InvestorInviteScope;
  /** Non-empty when scope is `deal`. */
  dealIds: string[];
  /** Rooms whose `dealId` matched selected deals at invite time. */
  dataRoomIds: string[];
  /** Normalized lowercase email when invite is tied to an address. */
  email?: string;
  message?: string;
  expiresAt: number;
  createdBy: string;
  createdAt: number;
  revokedAt?: number;
  acceptedAt?: number;
  acceptedUserId?: string;
  linkedInvestorId?: string;
};

export type DealCommitmentStatus = "active" | "withdrawn";

export type DealCommitmentInvestingAs = "individual" | "llc" | "trust" | "ira";

export type DealCommitment = {
  id: string;
  organizationId: string;
  dealId: string;
  userId: string;
  /** Whole currency units (e.g. USD dollars). */
  amount: number;
  currency: string;
  status: DealCommitmentStatus;
  /** Subscription / closing docs outstanding when set. */
  docStatus?: "pending" | "complete" | "none";
  investingAs?: DealCommitmentInvestingAs;
  entityName?: string;
  accreditationStatus?: string;
  preferredContact?: "email" | "phone" | "either";
  createdAt: number;
  updatedAt: number;
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
  /** Denormalized full name for search, discovery merge, and legacy rows. */
  name: string;
  firstName?: string;
  lastName?: string;
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
  /** Open task synced from Next follow-up (Tasks page). */
  followUpTaskId?: string;
  notesSummary?: string;
  documentsSharedCount?: number;
  pipelineStage: PipelineStage;
  committedAmount?: number;
  /** Defaults to active when omitted (legacy documents). */
  crmStatus?: InvestorCrmStatus;
  archivedAt?: number;
  /** Guest user UID when this CRM row is linked to an invited investor. */
  linkedUserId?: string;
  /** 0–100 rough close probability for weighted views. */
  investProbability?: number;
  referralSource?: string;
  interestedDealIds?: string[];
  relationshipOwnerUserId?: string;
  createdAt: number;
  updatedAt: number;
};

export type TaskType =
  | "follow_up"
  | "call_investor"
  | "send_docs"
  | "review_commitment"
  | "prepare_closing"
  | "update_room"
  | "other";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

/** Workflow column while status is open (completed column maps to status done). */
export type TaskWorkflowStatus =
  | "not_started"
  | "in_progress"
  | "waiting"
  | "blocked";

export type Task = {
  id: string;
  organizationId: string;
  title: string;
  assigneeId?: string;
  dueAt?: number;
  status: "open" | "done" | "cancelled";
  linkedInvestorId?: string;
  linkedDealId?: string;
  linkedDataRoomId?: string;
  /** Created when an investor profile sets Next follow-up. */
  isInvestorFollowUp?: boolean;
  taskType?: TaskType;
  taskPriority?: TaskPriority;
  workflowStatus?: TaskWorkflowStatus;
  description?: string;
  notes?: string;
  /** User who created the task (when known). */
  createdByUserId?: string;
  updatedAt?: number;
  /** Set when status transitions to done (best-effort). */
  completedAt?: number;
  snoozedUntil?: number;
  reminderAt?: number;
  /** Cron-style hint only; execution not guaranteed in v1. */
  repeatSchedule?: string;
  /** Idempotency for workflow-generated tasks. */
  sourceEventId?: string;
  createdAt: number;
};

export type TaskComment = {
  id: string;
  taskId: string;
  organizationId: string;
  authorId: string;
  body: string;
  createdAt: number;
};

export type Activity = {
  id: string;
  organizationId: string;
  investorId?: string;
  /** Set for deal-scoped events (e.g. telemetry) for efficient queries. */
  dealId?: string;
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

export type DealWhyInvestBlock = { title: string; body: string };

export type DealTractionMetric = { label: string; value: string; hint?: string };

export type DealUseOfFundsSplit = { label: string; pct: number };

export type DealFounder = {
  name?: string;
  role?: string;
  photoUrl?: string;
  bio?: string;
  highlights?: string[];
};

export type DealCtaVisibility = {
  showDataRoom?: boolean;
  showBookCall?: boolean;
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
  /** Why invest — six narrative fields edited in Deal settings. */
  marketOpportunity?: string;
  problem?: string;
  solution?: string;
  competitiveEdge?: string;
  growthStrategy?: string;
  exitPotential?: string;
  sponsorProfile?: string;
  returnsModel?: string;
  faqs?: { q: string; a: string }[];
  investorUpdates?: { title: string; body: string; createdAt: number }[];
  calendarBookingUrl?: string;
  createdAt: number;
  /** Premium portal fields (all optional, backward compatible). */
  tagline?: string;
  industry?: string;
  stage?: string;
  logoUrl?: string;
  whyInvest?: DealWhyInvestBlock[];
  tractionMetrics?: DealTractionMetric[];
  useOfFundsSplit?: DealUseOfFundsSplit[];
  founder?: DealFounder;
  jurisdiction?: string;
  eligibility?: string;
  cta?: DealCtaVisibility;
};

export type SigningRequestStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "completed"
  | "declined"
  | "error";

export type SigningRequest = {
  id: string;
  organizationId: string;
  dealId: string;
  userId: string;
  /** @deprecated Legacy external document id; native flows omit. */
  signwellDocumentId?: string;
  /** Native e-sign envelope document id when stored in `esign_envelopes`. */
  nativeEnvelopeId?: string;
  status: SigningRequestStatus;
  lastEventAt?: number;
  signingUrl?: string;
  /** When sponsor must complete fields before LP can sign */
  awaitingSponsorPrep?: boolean;
  /** LP can forward this URL to the sponsor when sponsor fields exist */
  sponsorSigningUrl?: string;
  createdAt: number;
  updatedAt: number;
};

/** Sponsor-initiated mutual NDA envelope (legacy rows may include deprecated external ids). */
export type MndaSigningRequest = {
  id: string;
  organizationId: string;
  dataRoomId: string;
  dealId?: string | null;
  createdByUid: string;
  investorEmail: string;
  investorName: string;
  signwellDocumentId?: string;
  sponsorSigningUrl?: string;
  investorSigningUrl?: string;
  status: SigningRequestStatus;
  lastEventAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type EsignFieldAssignee = "sponsor" | "investor";

export type EsignFieldType = "text" | "date" | "signature";

export type EsignFieldRectNorm = { x: number; y: number; w: number; h: number };

export type EsignTemplateField = {
  id: string;
  label?: string;
  fieldType: EsignFieldType;
  pageIndex: number;
  rectNorm: EsignFieldRectNorm;
  assignee: EsignFieldAssignee;
  required?: boolean;
};

export type SignableTemplate = {
  id: string;
  organizationId: string;
  name: string;
  storagePath: string;
  esignFields: EsignTemplateField[];
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
};

export type EsignEnvelopeContext =
  | { kind: "data_room_nda"; dataRoomId: string }
  | { kind: "deal_subscription"; dealId: string; userId: string }
  | { kind: "ad_hoc"; label?: string };

export type EsignSignerRole = "sponsor" | "investor" | "lp";

export type EsignEnvelope = {
  id: string;
  organizationId: string;
  signableTemplateId: string;
  context: EsignEnvelopeContext;
  status: SigningRequestStatus;
  createdByUid: string;
  /** Lowercase trimmed email for investor party when applicable */
  investorEmail?: string;
  investorEmailNorm?: string;
  investorName?: string;
  sponsorSigningUrl?: string;
  investorSigningUrl?: string;
  /** LP subscription signing URL */
  lpSigningUrl?: string;
  workingPdfStoragePath?: string;
  finalPdfStoragePath?: string;
  /** Who must sign next */
  nextSignerRole?: EsignSignerRole;
  /** After sponsor-only field burn for subscription flows */
  subscriptionPrepComplete?: boolean;
  sponsorEmailNorm?: string;
  lastEventAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type DataRoomVisibility = "open" | "invite_only";

/** Access tier for sponsor-side permission model (per document / room UI). */
export type DataRoomAccessRole = "admin" | "internal" | "investor" | "read_only_advisor";

export type DataRoom = {
  id: string;
  organizationId: string;
  dealId?: string;
  name: string;
  description?: string;
  ndaRequired: boolean;
  /** @deprecated Prefer `signableTemplateId` for native e-sign. */
  ndaTemplateRef?: string | null;
  /** `SignableTemplate` id when `ndaRequired` (native e-sign NDA). */
  signableTemplateId?: string | null;
  visibility?: DataRoomVisibility;
  downloadAllowed?: boolean;
  watermarkDocs?: boolean;
  expiresAt?: number;
  requireLogin?: boolean;
  welcomeMessage?: string;
  archived?: boolean;
  createdAt: number;
  updatedAt?: number;
};

export type RoomDocumentAccess = "invited" | "internal" | "vip";

export type RoomDocument = {
  id: string;
  organizationId: string;
  dataRoomId: string;
  name: string;
  storagePath: string;
  kind: "deck" | "model" | "ppm" | "video" | "legal" | "other";
  viewCount?: number;
  lastViewedAt?: number;
  /** File size on upload. */
  sizeBytes?: number;
  mimeType?: string;
  createdByUid?: string;
  version?: number;
  accessLevel?: RoomDocumentAccess;
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
