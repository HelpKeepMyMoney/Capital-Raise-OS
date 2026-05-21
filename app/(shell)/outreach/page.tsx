import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership, listDeals, listInvestors } from "@/lib/firestore/queries";
import { investorDisplayName } from "@/lib/investors/display-name";
import { isInvestorActive } from "@/lib/investors/investor-kpis";
import type { OutreachInvestorOption } from "@/lib/outreach/audience";
import { loadOutreachDashboardData } from "@/lib/outreach/server-queries";
import { OutreachDashboard } from "@/components/outreach/outreach-dashboard";
import { redirect } from "next/navigation";

export default async function OutreachPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const m = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(m?.role);

  const [data, deals, investors] = await Promise.all([
    loadOutreachDashboardData(ctx.orgId),
    listDeals(ctx.orgId),
    listInvestors(ctx.orgId, { limit: 500 }),
  ]);

  const investorOptions: OutreachInvestorOption[] = investors
    .filter(isInvestorActive)
    .map((inv) => ({
      id: inv.id,
      name: investorDisplayName(inv),
      email: inv.email?.trim() || undefined,
      firm: inv.firm?.trim() || undefined,
    }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Outreach</h1>
        <p className="mt-1 max-w-2xl text-foreground/85">
          Institutional fundraising outreach — sequences, investor fit, and engagement telemetry
          across your raise.
        </p>
      </div>
      <OutreachDashboard
        initialCampaigns={data.campaigns}
        initialSequences={data.sequences}
        initialEvents={data.events}
        initialFunnel={data.funnel}
        initialTimeSeries={data.timeSeries}
        deals={deals.map((d) => ({ id: d.id, name: d.name }))}
        investors={investorOptions}
      />
    </div>
  );
}
