import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { requireOrgSession } from "@/lib/auth/session";
import {
  funnelCounts,
  listDeals,
  listInvestors,
  listRecentActivities,
  listTasksDueToday,
  listUpcomingMeetings,
  weeklyOutreachStats,
  getMembership,
} from "@/lib/firestore/queries";
import { StatCard } from "@/components/dashboard/stat-card";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { OutreachChart } from "@/components/dashboard/outreach-chart";
import { redirect } from "next/navigation";

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export default async function DashboardPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(membership?.role);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [investors, activities, tasksToday, meetings, deals, outreach] = await Promise.all([
    listInvestors(ctx.orgId),
    listRecentActivities(ctx.orgId, 12),
    listTasksDueToday(ctx.orgId, start.getTime(), end.getTime()),
    listUpcomingMeetings(ctx.orgId, Date.now(), 20),
    listDeals(ctx.orgId),
    weeklyOutreachStats(ctx.orgId),
  ]);

  const funnel = funnelCounts(investors);
  const activeConversations = investors.filter((i) =>
    ["contacted", "responded", "meeting_scheduled", "data_room_opened", "due_diligence"].includes(
      i.pipelineStage,
    ),
  ).length;
  const committed = investors.reduce((s, i) => s + (i.committedAmount ?? 0), 0);
  const closed = investors
    .filter((i) => i.pipelineStage === "closed")
    .reduce((s, i) => s + (i.committedAmount ?? 0), 0);
  const opportunities = deals.filter((d) => d.status === "active").length;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Executive dashboard</h1>
        <p className="mt-1 text-foreground/85">
          Real-time fundraising command center for your organization.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total investors" value={String(investors.length)} delay={0} />
        <StatCard title="Active conversations" value={String(activeConversations)} delay={0.05} />
        <StatCard title="Committed capital" value={fmtMoney(committed)} delay={0.1} />
        <StatCard title="Capital closed" value={fmtMoney(closed)} delay={0.15} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Open opportunities" value={String(opportunities)} hint="Active offerings" />
        <StatCard title="Meetings scheduled" value={String(meetings.length)} hint="Upcoming" />
        <StatCard title="Tasks due today" value={String(tasksToday.length)} />
        <StatCard
          title="Reply velocity"
          value={`${outreach.at(-1)?.replies ?? 0}`}
          hint="Replies last ISO week (from outreach)"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelChart data={funnel} />
        <OutreachChart data={outreach} />
      </div>

      <ActivityFeed items={activities} />
    </div>
  );
}
