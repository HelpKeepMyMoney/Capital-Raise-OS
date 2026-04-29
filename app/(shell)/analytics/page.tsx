import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { requireOrgSession } from "@/lib/auth/session";
import {
  averageDaysToClose,
  funnelCounts,
  getOrganization,
  listCampaignsForOrg,
  listDealCommitmentsForOrganization,
  listEmailsForOrg,
  listInvestors,
  getMembership,
} from "@/lib/firestore/queries";
import { canAdvancedAnalytics, effectivePlan } from "@/lib/billing/features";
import { AnalyticsChartGrids } from "@/components/analytics/analytics-chart-grids";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AnalyticsPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(membership?.role);

  const org = await getOrganization(ctx.orgId);
  const plan = effectivePlan(org?.subscription?.plan);
  const advancedAnalytics = canAdvancedAnalytics(plan);

  const [investors, commitments, campaigns, emails] = await Promise.all([
    listInvestors(ctx.orgId),
    listDealCommitmentsForOrganization(ctx.orgId),
    listCampaignsForOrg(ctx.orgId),
    listEmailsForOrg(ctx.orgId, 400),
  ]);

  const funnel = funnelCounts(investors);
  const committedCount = investors.filter((i) => i.pipelineStage === "committed" || i.pipelineStage === "closed")
    .length;
  const meetingStage = investors.filter((i) => i.pipelineStage === "meeting_scheduled").length;
  const funded = investors.filter((i) => i.pipelineStage === "closed").length;
  const meetingToCommitPct = meetingStage ? Math.round((committedCount / meetingStage) * 100) : null;
  const commitToFundedPct = committedCount ? Math.round((funded / committedCount) * 100) : null;
  const avgClose = averageDaysToClose(investors);

  const byType = new Map<string, number>();
  for (const i of investors) {
    const k = i.investorType ?? "unknown";
    byType.set(k, (byType.get(k) ?? 0) + 1);
  }
  const sourceChart = Array.from(byType.entries()).map(([name, count]) => ({
    name: name.replace(/_/g, " "),
    count,
  }));

  const raisedByMonth = new Map<string, number>();
  for (const c of commitments) {
    if (c.status !== "active") continue;
    const d = new Date(c.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    raisedByMonth.set(key, (raisedByMonth.get(key) ?? 0) + c.amount);
  }
  const capitalChart = Array.from(raisedByMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, total]) => ({ label, total }));

  const repeatEmails = new Map<string, number>();
  for (const i of investors) {
    const e = i.email?.trim().toLowerCase();
    if (e) repeatEmails.set(e, (repeatEmails.get(e) ?? 0) + 1);
  }
  const repeatInvestors = [...repeatEmails.values()].filter((n) => n > 1).length;

  const campaignPerf = campaigns.slice(0, 8).map((c) => ({
    name: c.name.slice(0, 24),
    sent: c.stats?.sent ?? 0,
    replied: c.stats?.replied ?? 0,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Analytics
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Funnel economics, capital velocity, and campaign performance — not vanity metrics.
        </p>
      </div>

      {!advancedAnalytics ? (
        <Card className="rounded-2xl border-amber-500/35 bg-amber-500/10 shadow-sm">
          <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-950 dark:text-amber-50">
              Advanced analytics and attribution are included on <strong>Pro</strong> and above. Upgrade
              to unlock cohort views and deeper campaign breakdowns as we ship them.
            </p>
            <Link
              href="/settings/billing"
              className="shrink-0 rounded-xl bg-foreground px-4 py-2 text-center text-sm font-medium text-background"
            >
              View plans
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-border/80 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Meeting → commitment
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {meetingToCommitPct != null ? `${meetingToCommitPct}%` : "—"}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/80 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Commitment → funded
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {commitToFundedPct != null ? `${commitToFundedPct}%` : "—"}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/80 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Avg. days to close
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {avgClose ?? "—"}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/80 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Repeat investors (email)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{repeatInvestors}</CardContent>
        </Card>
      </div>

      <AnalyticsChartGrids
        funnel={funnel}
        capitalChart={capitalChart}
        sourceChart={sourceChart}
        campaignPerf={campaignPerf}
        outreachSidebar={
          <Card className="rounded-2xl border-border/80 shadow-md">
            <CardHeader>
              <CardTitle className="font-heading text-base">Outreach sample</CardTitle>
              <p className="text-xs text-muted-foreground">
                {emails.length} recent emails tracked — expand with Resend webhooks for full attribution.
              </p>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Delivered:{" "}
                <span className="font-medium text-foreground">
                  {emails.filter((e) => e.status === "delivered" || e.status === "sent").length}
                </span>
              </p>
              <p className="mt-1">
                With reply sentiment:{" "}
                <span className="font-medium text-foreground">
                  {emails.filter((e) => e.replySentiment && e.replySentiment !== "unknown").length}
                </span>
              </p>
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
