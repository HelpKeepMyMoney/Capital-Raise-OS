import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/firestore/queries";
import { DiscoveryClient } from "@/components/discovery-client";
import { redirect } from "next/navigation";

export default async function DiscoveryPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const m = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(m?.role);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Investor discovery</h1>
        <p className="mt-1 text-foreground/85">
          AI-ranked search across your CRM with pluggable enrichment providers.
        </p>
      </div>
      <DiscoveryClient />
    </div>
  );
}
