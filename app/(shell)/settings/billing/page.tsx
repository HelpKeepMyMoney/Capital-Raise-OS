import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/firestore/queries";
import { redirect } from "next/navigation";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(membership?.role);
  return <BillingClient />;
}
