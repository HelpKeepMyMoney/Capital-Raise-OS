import type { SubscriptionPlan } from "@/lib/firestore/types";

export type Entitlements = {
  maxSeats: number;
  dataRoomGb: number;
  monthlyAiCredits: number;
  outreachEmailsPerMonth: number;
};

const DEFAULTS: Record<SubscriptionPlan, Entitlements> = {
  none: { maxSeats: 2, dataRoomGb: 1, monthlyAiCredits: 20, outreachEmailsPerMonth: 100 },
  starter: { maxSeats: 5, dataRoomGb: 10, monthlyAiCredits: 500, outreachEmailsPerMonth: 2500 },
  pro: { maxSeats: 25, dataRoomGb: 50, monthlyAiCredits: 2500, outreachEmailsPerMonth: 15000 },
  capital_team: { maxSeats: 100, dataRoomGb: 250, monthlyAiCredits: 10000, outreachEmailsPerMonth: 75000 },
  enterprise: { maxSeats: 1000, dataRoomGb: 2000, monthlyAiCredits: 50000, outreachEmailsPerMonth: 500000 },
};

export function getEntitlements(plan: SubscriptionPlan | undefined): Entitlements {
  if (!plan) return DEFAULTS.none;
  return DEFAULTS[plan] ?? DEFAULTS.none;
}
