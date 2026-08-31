import { z } from "zod";
import {
  InvestorCrmStatusSchema,
  InvestorTypeSchema,
  PipelineStageSchema,
  WarmColdSchema,
  type Investor,
} from "@/lib/firestore/types";
import { buildInvestorFullName } from "@/lib/investors/display-name";

const optTrim = z.string().trim().max(500);

export const ApiInvestorCreateSchema = z
  .object({
    firstName: z.string().trim().min(1, "firstName is required").max(200),
    lastName: optTrim.optional(),
    firm: optTrim.optional(),
    title: optTrim.optional(),
    email: z.string().trim().email().max(254).optional().or(z.literal("")),
    phone: optTrim.optional(),
    website: optTrim.optional(),
    linkedIn: optTrim.optional(),
    location: optTrim.optional(),
    investorType: InvestorTypeSchema.optional(),
    pipelineStage: PipelineStageSchema.optional(),
    warmCold: WarmColdSchema.optional(),
    checkSizeMin: z.number().nonnegative().optional(),
    checkSizeMax: z.number().nonnegative().optional(),
    notes: z.string().trim().max(50_000).optional(),
    notesSummary: z.string().trim().max(5000).optional(),
    relationshipScore: z.number().min(0).max(100).optional(),
    nextFollowUpAt: z.number().positive().nullable().optional(),
    committedAmount: z.number().nonnegative().optional(),
    investProbability: z.number().min(0).max(100).optional(),
    referralSource: optTrim.optional(),
    interestedDealIds: z.array(z.string().min(1).max(128)).max(50).optional(),
    relationshipOwnerUserId: optTrim.optional(),
    lastContactAt: z.number().nonnegative().optional(),
    crmStatus: InvestorCrmStatusSchema.optional(),
  })
  .strict();

export const ApiInvestorPatchSchema = z
  .object({
    firstName: z.string().trim().min(1).max(200).optional(),
    lastName: optTrim.nullable().optional(),
    firm: optTrim.nullable().optional(),
    title: optTrim.nullable().optional(),
    email: z.union([z.string().trim().email().max(254), z.literal(""), z.null()]).optional(),
    phone: optTrim.nullable().optional(),
    website: optTrim.nullable().optional(),
    linkedIn: optTrim.nullable().optional(),
    location: optTrim.nullable().optional(),
    investorType: InvestorTypeSchema.nullable().optional(),
    pipelineStage: PipelineStageSchema.optional(),
    warmCold: WarmColdSchema.nullable().optional(),
    checkSizeMin: z.number().nonnegative().nullable().optional(),
    checkSizeMax: z.number().nonnegative().nullable().optional(),
    notes: z.string().trim().max(50_000).nullable().optional(),
    notesSummary: z.string().trim().max(5000).nullable().optional(),
    relationshipScore: z.number().min(0).max(100).nullable().optional(),
    nextFollowUpAt: z.number().positive().nullable().optional(),
    committedAmount: z.number().nonnegative().nullable().optional(),
    investProbability: z.number().min(0).max(100).nullable().optional(),
    referralSource: optTrim.nullable().optional(),
    interestedDealIds: z.array(z.string().min(1).max(128)).max(50).nullable().optional(),
    relationshipOwnerUserId: optTrim.nullable().optional(),
    lastContactAt: z.number().nonnegative().nullable().optional(),
    crmStatus: InvestorCrmStatusSchema.optional(),
  })
  .strict();

export type ApiInvestorCreate = z.infer<typeof ApiInvestorCreateSchema>;
export type ApiInvestorPatch = z.infer<typeof ApiInvestorPatchSchema>;

function emptyToNull(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const t = v.trim();
  return t ? t : null;
}

export function investorCreateToDoc(
  orgId: string,
  data: ApiInvestorCreate,
  now: number,
): Record<string, unknown> {
  const firstName = data.firstName;
  const lastName = data.lastName?.trim() || "";
  const email = data.email === "" || data.email === undefined ? undefined : data.email;
  const doc: Record<string, unknown> = {
    organizationId: orgId,
    firstName,
    lastName: lastName || null,
    name: buildInvestorFullName(firstName, lastName),
    pipelineStage: data.pipelineStage ?? "lead",
    crmStatus: data.crmStatus ?? "active",
    createdAt: now,
    updatedAt: now,
  };
  if (data.crmStatus === "archived") doc.archivedAt = now;
  if (data.firm?.trim()) doc.firm = data.firm.trim();
  if (data.title?.trim()) doc.title = data.title.trim();
  if (email) doc.email = email;
  if (data.phone?.trim()) doc.phone = data.phone.trim();
  if (data.website?.trim()) doc.website = data.website.trim();
  if (data.linkedIn?.trim()) doc.linkedIn = data.linkedIn.trim();
  if (data.location?.trim()) doc.location = data.location.trim();
  if (data.investorType !== undefined) doc.investorType = data.investorType;
  if (data.warmCold !== undefined) doc.warmCold = data.warmCold;
  if (data.checkSizeMin !== undefined) doc.checkSizeMin = data.checkSizeMin;
  if (data.checkSizeMax !== undefined) doc.checkSizeMax = data.checkSizeMax;
  if (data.notes?.trim()) doc.notes = data.notes.trim();
  if (data.notesSummary?.trim()) doc.notesSummary = data.notesSummary.trim();
  if (data.relationshipScore !== undefined) doc.relationshipScore = data.relationshipScore;
  if (data.nextFollowUpAt != null) doc.nextFollowUpAt = data.nextFollowUpAt;
  if (data.committedAmount !== undefined) doc.committedAmount = data.committedAmount;
  if (data.investProbability !== undefined) doc.investProbability = data.investProbability;
  if (data.referralSource?.trim()) doc.referralSource = data.referralSource.trim();
  if (data.interestedDealIds?.length) doc.interestedDealIds = data.interestedDealIds;
  if (data.relationshipOwnerUserId?.trim()) doc.relationshipOwnerUserId = data.relationshipOwnerUserId.trim();
  if (data.lastContactAt !== undefined) doc.lastContactAt = data.lastContactAt;
  return doc;
}

export function investorPatchToUpdate(
  existing: Investor,
  data: ApiInvestorPatch,
  now: number,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { updatedAt: now };

  if (data.firstName !== undefined || data.lastName !== undefined) {
    const firstName = data.firstName ?? existing.firstName ?? "";
    const lastName =
      data.lastName !== undefined ? (data.lastName ?? "") : (existing.lastName ?? "");
    patch.firstName = firstName;
    patch.lastName = lastName.trim() || null;
    patch.name = buildInvestorFullName(firstName, lastName);
  }

  if (data.firm !== undefined) patch.firm = emptyToNull(data.firm);
  if (data.title !== undefined) patch.title = emptyToNull(data.title);
  if (data.email !== undefined) patch.email = data.email === "" || data.email === null ? null : data.email;
  if (data.phone !== undefined) patch.phone = emptyToNull(data.phone);
  if (data.website !== undefined) patch.website = emptyToNull(data.website);
  if (data.linkedIn !== undefined) patch.linkedIn = emptyToNull(data.linkedIn);
  if (data.location !== undefined) patch.location = emptyToNull(data.location);
  if (data.investorType !== undefined) patch.investorType = data.investorType;
  if (data.warmCold !== undefined) patch.warmCold = data.warmCold;
  if (data.checkSizeMin !== undefined) patch.checkSizeMin = data.checkSizeMin;
  if (data.checkSizeMax !== undefined) patch.checkSizeMax = data.checkSizeMax;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.notesSummary !== undefined) patch.notesSummary = data.notesSummary;
  if (data.relationshipScore !== undefined) patch.relationshipScore = data.relationshipScore;
  if (data.nextFollowUpAt !== undefined) patch.nextFollowUpAt = data.nextFollowUpAt;
  if (data.committedAmount !== undefined) patch.committedAmount = data.committedAmount;
  if (data.investProbability !== undefined) patch.investProbability = data.investProbability;
  if (data.referralSource !== undefined) patch.referralSource = emptyToNull(data.referralSource);
  if (data.interestedDealIds !== undefined) {
    patch.interestedDealIds = data.interestedDealIds?.length ? data.interestedDealIds : null;
  }
  if (data.relationshipOwnerUserId !== undefined) {
    patch.relationshipOwnerUserId = emptyToNull(data.relationshipOwnerUserId);
  }
  if (data.lastContactAt !== undefined) patch.lastContactAt = data.lastContactAt;
  if (data.pipelineStage !== undefined) patch.pipelineStage = data.pipelineStage;
  if (data.crmStatus !== undefined) {
    patch.crmStatus = data.crmStatus;
    patch.archivedAt = data.crmStatus === "archived" ? now : null;
  }

  return patch;
}
