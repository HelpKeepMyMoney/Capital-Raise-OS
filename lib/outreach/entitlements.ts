import type { Firestore } from "firebase-admin/firestore";
import { col } from "@/lib/firestore/paths";
import { getOrganization } from "@/lib/firestore/queries";
import { effectivePlan } from "@/lib/billing/features";
import type { SubscriptionPlan } from "@/lib/firestore/types";
import { getEntitlements } from "@/lib/billing/entitlements";

function monthStartUtc(): number {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/** Counts outreach sends via `outreach_touches` (canonical since multi-touch outreach). */
export async function countOutreachSendsThisMonth(
  db: Firestore,
  organizationId: string,
): Promise<number> {
  const start = monthStartUtc();
  const touchesSnap = await db
    .collection(col.outreachTouches)
    .where("organizationId", "==", organizationId)
    .where("createdAt", ">=", start)
    .limit(5000)
    .get();
  return touchesSnap.size;
}

export async function assertOutreachSendAllowed(
  db: Firestore,
  organizationId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const org = await getOrganization(organizationId);
  const plan = effectivePlan(org?.subscription?.plan) as SubscriptionPlan;
  const limit = getEntitlements(plan).outreachEmailsPerMonth;
  const used = await countOutreachSendsThisMonth(db, organizationId);
  if (used >= limit) {
    return {
      ok: false,
      message: `Monthly outreach limit reached (${limit} emails). Upgrade your plan under Settings → Billing.`,
    };
  }
  return { ok: true };
}
