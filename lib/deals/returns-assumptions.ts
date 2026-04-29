export type ReturnScenarioId = "conservative" | "base" | "upside";

/** Illustrative assumption sets only — not predictions or offering terms. */
export const RETURN_SCENARIOS: Record<
  ReturnScenarioId,
  { label: string; annualCouponPct: number; revenueShareMultiple: number; years: number }
> = {
  conservative: {
    label: "Conservative",
    annualCouponPct: 0.06,
    revenueShareMultiple: 0.08,
    years: 3,
  },
  base: {
    label: "Base",
    annualCouponPct: 0.1,
    revenueShareMultiple: 0.15,
    years: 3,
  },
  upside: {
    label: "Upside",
    annualCouponPct: 0.12,
    revenueShareMultiple: 0.28,
    years: 3,
  },
};

export function projectedReturns(
  principal: number,
  scenario: ReturnScenarioId,
): {
  principal: number;
  interest: number;
  revenueShareEstimate: number;
  totalPayout: number;
  moic: number;
} {
  const s = RETURN_SCENARIOS[scenario];
  const interest = Math.round(principal * s.annualCouponPct * s.years);
  const revenueShareEstimate = Math.round(principal * s.revenueShareMultiple);
  const totalPayout = principal + interest + revenueShareEstimate;
  const moic = principal > 0 ? totalPayout / principal : 0;
  return {
    principal,
    interest,
    revenueShareEstimate,
    totalPayout,
    moic: Math.round(moic * 100) / 100,
  };
}
