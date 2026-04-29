export const PAYPAL_PLAN_ENV = {
  starter: "PAYPAL_PLAN_STARTER_ID",
  pro: "PAYPAL_PLAN_PRO_ID",
  capital_team: "PAYPAL_PLAN_CAPITAL_TEAM_ID",
} as const;

export type PublicPlanId = keyof typeof PAYPAL_PLAN_ENV;

/** PayPal-backed tiers in ascending price order for the billing UI. */
export const BILLING_PLAN_ORDER: PublicPlanId[] = ["starter", "pro", "capital_team"];

export const PLAN_CATALOG: Record<
  PublicPlanId,
  { name: string; priceUsd: number; description: string; blurb?: string }
> = {
  starter: {
    name: "Starter",
    priceUsd: 99,
    description: "Solo founders and small syndicates getting started.",
    blurb: "Core CRM, deals, and LP portal",
  },
  pro: {
    name: "Pro",
    priceUsd: 299,
    description: "Growing funds and active issuers.",
    blurb: "AI Copilot, analytics, and automation",
  },
  capital_team: {
    name: "Growth",
    priceUsd: 999,
    description: "Multi-deal teams with advanced automation and brand control.",
    blurb: "White-label portal + unlimited seats",
  },
};

/** Feature flags per paid tier (used for billing matrix and copy). Enterprise is contact-only. */
export const PLAN_FEATURES: Record<
  PublicPlanId,
  {
    copilot: boolean;
    whiteLabelPortal: boolean;
    advancedAnalytics: boolean;
    teamSeatsLabel: string;
    automationLabel: string;
  }
> = {
  starter: {
    copilot: false,
    whiteLabelPortal: false,
    advancedAnalytics: false,
    teamSeatsLabel: "1 seat",
    automationLabel: "Core workflows",
  },
  pro: {
    copilot: true,
    whiteLabelPortal: false,
    advancedAnalytics: true,
    teamSeatsLabel: "Up to 5 seats",
    automationLabel: "Tasks, outreach, and interest automation",
  },
  capital_team: {
    copilot: true,
    whiteLabelPortal: true,
    advancedAnalytics: true,
    teamSeatsLabel: "Unlimited seats",
    automationLabel: "Advanced automation and integrations",
  },
};

export const ENTERPRISE_FEATURE_CELLS = {
  copilot: true,
  whiteLabelPortal: true,
  advancedAnalytics: true,
  teamSeatsLabel: "Custom / SCIM",
  automationLabel: "Dedicated playbook + SLA",
} as const;

export const FEATURE_MATRIX_ROWS: {
  key: keyof typeof PLAN_FEATURES["starter"];
  label: string;
}[] = [
  { key: "copilot", label: "AI Copilot" },
  { key: "whiteLabelPortal", label: "White-label LP portal" },
  { key: "advancedAnalytics", label: "Advanced analytics" },
  { key: "teamSeatsLabel", label: "Team seats" },
  { key: "automationLabel", label: "Automation" },
];

export function getPayPalPlanId(plan: PublicPlanId): string | undefined {
  const envKey = PAYPAL_PLAN_ENV[plan];
  return process.env[envKey];
}
