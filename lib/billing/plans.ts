export const PAYPAL_PLAN_ENV = {
  starter: "PAYPAL_PLAN_STARTER_ID",
  pro: "PAYPAL_PLAN_PRO_ID",
  capital_team: "PAYPAL_PLAN_CAPITAL_TEAM_ID",
} as const;

export type PublicPlanId = keyof typeof PAYPAL_PLAN_ENV;

export const PLAN_CATALOG: Record<
  PublicPlanId,
  { name: string; priceUsd: number; description: string }
> = {
  starter: {
    name: "Starter",
    priceUsd: 99,
    description: "Solo founders and small syndicates getting started.",
  },
  pro: {
    name: "Pro",
    priceUsd: 299,
    description: "Growing funds and active issuers.",
  },
  capital_team: {
    name: "Capital Team",
    priceUsd: 999,
    description: "Multi-deal teams with advanced automation.",
  },
};

export function getPayPalPlanId(plan: PublicPlanId): string | undefined {
  const envKey = PAYPAL_PLAN_ENV[plan];
  return process.env[envKey];
}
