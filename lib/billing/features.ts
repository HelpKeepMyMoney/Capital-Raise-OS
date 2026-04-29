import type { SubscriptionPlan } from "@/lib/firestore/types";

export function effectivePlan(plan: SubscriptionPlan | undefined): SubscriptionPlan {
  return plan ?? "none";
}

export function canUseAiCopilot(plan: SubscriptionPlan | undefined): boolean {
  const p = effectivePlan(plan);
  return p === "pro" || p === "capital_team" || p === "enterprise";
}

export function canWhiteLabelPortal(plan: SubscriptionPlan | undefined): boolean {
  const p = effectivePlan(plan);
  return p === "capital_team" || p === "enterprise";
}

export function canAdvancedAnalytics(plan: SubscriptionPlan | undefined): boolean {
  const p = effectivePlan(plan);
  return p !== "starter" && p !== "none";
}
