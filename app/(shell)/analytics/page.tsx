import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { requireOrgSession } from "@/lib/auth/session";
import { funnelCounts, listInvestors, getMembership } from "@/lib/firestore/queries";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(membership?.role);
  const investors = await listInvestors(ctx.orgId);
  const funnel = funnelCounts(investors);
  const committed = investors.filter((i) => i.pipelineStage === "committed" || i.pipelineStage === "closed")
    .length;
  const meetings = investors.filter((i) => i.pipelineStage === "meeting_scheduled").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Analytics center</h1>
        <p className="mt-1 text-foreground/85">
          Funnel economics, template performance, and GA4-ready event taxonomy.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Meeting → commitment</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {meetings ? `${Math.round((committed / meetings) * 100)}%` : "—"}
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Avg. relationship score</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {investors.length
              ? Math.round(
                  investors.reduce((s, i) => s + (i.relationshipScore ?? 0), 0) / investors.length,
                )
              : "—"}
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Pipeline coverage</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{investors.length} investors</CardContent>
        </Card>
      </div>
      <FunnelChart data={funnel} />
    </div>
  );
}
