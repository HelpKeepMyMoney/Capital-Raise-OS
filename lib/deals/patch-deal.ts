import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { DealStatusSchema, DealTypeSchema } from "@/lib/firestore/types";

const whyInvestBlock = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20_000),
});

const tractionMetric = z.object({
  label: z.string().min(1).max(120),
  value: z.string().min(1).max(120),
  hint: z.string().max(500).optional(),
});

const useOfFundsSplit = z.object({
  label: z.string().min(1).max(120),
  pct: z.number().min(0).max(100),
});

const founder = z.object({
  name: z.string().max(200).optional(),
  role: z.string().max(200).optional(),
  photoUrl: z.string().url().max(2000).optional().or(z.literal("")),
  bio: z.string().max(20_000).optional(),
  highlights: z.array(z.string().max(500)).max(20).optional(),
});

const ctaVisibility = z.object({
  showDataRoom: z.boolean().optional(),
  showBookCall: z.boolean().optional(),
});

/** PATCH body: only include fields to update. */
export const DealPatchBodySchema = z
  .object({
    name: z.string().min(1).max(500).optional(),
    type: DealTypeSchema.optional(),
    status: DealStatusSchema.optional(),
    targetRaise: z.number().positive().max(1e15).nullable().optional(),
    minimumInvestment: z.number().positive().max(1e15).nullable().optional(),
    valuation: z.number().positive().max(1e15).nullable().optional(),
    terms: z.string().max(50_000).nullable().optional(),
    useOfProceeds: z.string().max(50_000).nullable().optional(),
    closeDate: z.number().positive().nullable().optional(),
    marketOpportunity: z.string().max(30_000).nullable().optional(),
    problem: z.string().max(30_000).nullable().optional(),
    solution: z.string().max(30_000).nullable().optional(),
    competitiveEdge: z.string().max(30_000).nullable().optional(),
    growthStrategy: z.string().max(30_000).nullable().optional(),
    exitPotential: z.string().max(30_000).nullable().optional(),
    sponsorProfile: z.string().max(100_000).nullable().optional(),
    returnsModel: z.string().max(50_000).nullable().optional(),
    calendarBookingUrl: z.string().url().max(2000).nullable().optional().or(z.literal("")),
    faqs: z.array(z.object({ q: z.string().max(500), a: z.string().max(20_000) })).max(80).optional(),
    tagline: z.string().max(500).nullable().optional(),
    industry: z.string().max(200).nullable().optional(),
    stage: z.string().max(200).nullable().optional(),
    logoUrl: z.string().url().max(2000).nullable().optional().or(z.literal("")),
    whyInvest: z.array(whyInvestBlock).max(24).optional(),
    tractionMetrics: z.array(tractionMetric).max(24).optional(),
    useOfFundsSplit: z.array(useOfFundsSplit).max(24).optional(),
    founder: founder.optional().nullable(),
    jurisdiction: z.string().max(500).nullable().optional(),
    eligibility: z.string().max(10_000).nullable().optional(),
    cta: ctaVisibility.optional().nullable(),
  })
  .strict();

export type DealPatchBody = z.infer<typeof DealPatchBodySchema>;

function setOrDel(u: Record<string, unknown>, key: string, v: unknown) {
  if (v === undefined) return;
  if (v === null) u[key] = FieldValue.delete();
  else u[key] = v;
}

/**
 * Build Firestore update object from validated patch. Use with `update()`.
 */
export function dealPatchToFirestoreUpdate(patch: DealPatchBody): Record<string, unknown> {
  const u: Record<string, unknown> = {};

  if (patch.name !== undefined) u.name = patch.name;
  if (patch.type !== undefined) u.type = patch.type;
  if (patch.status !== undefined) u.status = patch.status;

  setOrDel(u, "targetRaise", patch.targetRaise);
  setOrDel(u, "minimumInvestment", patch.minimumInvestment);
  setOrDel(u, "valuation", patch.valuation);
  setOrDel(u, "terms", patch.terms);
  setOrDel(u, "useOfProceeds", patch.useOfProceeds);
  setOrDel(u, "closeDate", patch.closeDate);
  setOrDel(u, "marketOpportunity", patch.marketOpportunity);
  setOrDel(u, "problem", patch.problem);
  setOrDel(u, "solution", patch.solution);
  setOrDel(u, "competitiveEdge", patch.competitiveEdge);
  setOrDel(u, "growthStrategy", patch.growthStrategy);
  setOrDel(u, "exitPotential", patch.exitPotential);
  setOrDel(u, "sponsorProfile", patch.sponsorProfile);
  setOrDel(u, "returnsModel", patch.returnsModel);

  if (patch.calendarBookingUrl !== undefined) {
    const c = patch.calendarBookingUrl;
    if (c === null || c === "") u.calendarBookingUrl = FieldValue.delete();
    else u.calendarBookingUrl = c;
  }

  if (patch.faqs !== undefined) u.faqs = patch.faqs;

  setOrDel(u, "tagline", patch.tagline);
  setOrDel(u, "industry", patch.industry);
  setOrDel(u, "stage", patch.stage);
  if (patch.logoUrl !== undefined) {
    const x = patch.logoUrl;
    if (x === null || x === "") u.logoUrl = FieldValue.delete();
    else u.logoUrl = x;
  }
  if (patch.whyInvest !== undefined) u.whyInvest = patch.whyInvest;
  if (patch.tractionMetrics !== undefined) u.tractionMetrics = patch.tractionMetrics;
  if (patch.useOfFundsSplit !== undefined) u.useOfFundsSplit = patch.useOfFundsSplit;
  if (patch.founder !== undefined) {
    if (patch.founder === null) u.founder = FieldValue.delete();
    else u.founder = patch.founder;
  }
  setOrDel(u, "jurisdiction", patch.jurisdiction);
  setOrDel(u, "eligibility", patch.eligibility);
  if (patch.cta !== undefined) {
    if (patch.cta === null) u.cta = FieldValue.delete();
    else u.cta = patch.cta;
  }

  return u;
}
