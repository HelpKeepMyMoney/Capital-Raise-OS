import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import {
  averageDaysToClose,
  listDealCommitmentsForOrganization,
  listDeals,
  listInvestors,
  listOpenTasks,
  listRecentActivities,
  listTasksDueToday,
  listUpcomingMeetings,
  openTasksDueBefore,
  weeklyOutreachStats,
  weightedPipelineValueUsd,
  getMembership,
  dashboardEngagementDailySeries,
} from "@/lib/firestore/queries";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AlertStrip } from "@/components/dashboard/alert-strip";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { OutreachChart } from "@/components/dashboard/outreach-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { PriorityTasks } from "@/components/dashboard/priority-tasks";
import { QuickActions } from "@/components/dashboard/quick-actions";
import type { DashboardAlert } from "@/components/dashboard/alert-bar";
import { aggregatePipelineStages, qualifiedProspectCount } from "@/lib/dashboard/pipeline-aggregate";
import {
  buildDashboardAlerts,
  fmtMoney,
  meetingSoonAlert,
  outreachReplyRateTrend,
} from "@/lib/dashboard/alerts";

export default async function DashboardPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(membership?.role);
  const canManage = membership != null && canEditOrgData(membership.role);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [
    investors,
    activities,
    tasksToday,
    openTasks,
    meetings,
    deals,
    weeklyOutreach,
    commitments,
    engagementDaily,
  ] = await Promise.all([
    listInvestors(ctx.orgId),
    listRecentActivities(ctx.orgId, 14),
    listTasksDueToday(ctx.orgId, start.getTime(), end.getTime()),
    listOpenTasks(ctx.orgId, 120),
    listUpcomingMeetings(ctx.orgId),
    listDeals(ctx.orgId),
    weeklyOutreachStats(ctx.orgId),
    listDealCommitmentsForOrganization(ctx.orgId),
    dashboardEngagementDailySeries(ctx.orgId, 90),
  ]);

  const pipelineAgg = aggregatePipelineStages(investors);
  const activeConversations = investors.filter((i) =>
    ["contacted", "responded", "meeting_scheduled", "data_room_opened", "due_diligence"].includes(
      i.pipelineStage,
    ),
  ).length;
  const committed = investors.reduce((s, i) => s + (i.committedAmount ?? 0), 0);
  const closedCap = investors
    .filter((i) => i.pipelineStage === "closed")
    .reduce((s, i) => s + (i.committedAmount ?? 0), 0);
  const weightedPipe = weightedPipelineValueUsd(investors);
  const avgClose = averageDaysToClose(investors);
  const overdueTasks = openTasksDueBefore(openTasks, start.getTime());
  const qProspects = qualifiedProspectCount(investors);

  const pendingDocs = commitments.filter((c) => c.status === "active" && c.docStatus === "pending");

  const replyRt = outreachReplyRateTrend(weeklyOutreach);
  const engagementTrend =
    replyRt == null
      ? null
      : {
          direction: replyRt.direction,
          label:
            replyRt.direction === "flat"
              ? "Reply rate steady vs prior week"
              : `${replyRt.pctPoints} pts reply rate vs prior week`,
        };

  const referralHit = activities.find(
    (a) =>
      /referral|intro/i.test(a.summary) ||
      (a.metadata && String((a.metadata as { source?: string }).source ?? "").includes("referral")),
  );
  const extraAlerts: DashboardAlert[] = [];
  if (referralHit) {
    extraAlerts.push({
      id: `referral-${referralHit.id}`,
      tone: "gold",
      message: `Warm signal: ${referralHit.summary.slice(0, 120)}${referralHit.summary.length > 120 ? "…" : ""}`,
      href: referralHit.investorId ? `/investors/${referralHit.investorId}` : "/investors",
    });
  }

  const roomView = activities.find((a) => a.type === "data_room_view" || a.type === "deal_room_view");
  if (roomView) {
    extraAlerts.push({
      id: `room-${roomView.id}`,
      tone: "info",
      message: `Engagement: ${roomView.summary}`,
      href: roomView.investorId ? `/investors/${roomView.investorId}` : "/data-room",
    });
  }

  const meetAlert = meetingSoonAlert(meetings);
  if (meetAlert) extraAlerts.push(meetAlert);

  const alerts = [
    ...buildDashboardAlerts({
      commitments,
      investors,
      deals,
      overdueTaskCount: overdueTasks.length,
      tasksDueTodayCount: tasksToday.length,
      startOfToday: start.getTime(),
    }),
    ...extraAlerts,
  ].slice(0, 8);

  const investorNames = Object.fromEntries(investors.map((i) => [i.id, i.name]));
  const dealNames = Object.fromEntries(deals.map((d) => [d.id, d.name]));

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      <DashboardHeader />

      <AlertStrip alerts={alerts} />

      <section className="space-y-4">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Key intelligence
        </h2>
        <DashboardKpiGrid
          investorsCount={investors.length}
          activeConversations={activeConversations}
          weightedPipelineLabel={fmtMoney(weightedPipe)}
          qualifiedProspectCount={qProspects}
          capitalCommittedLabel={fmtMoney(committed)}
          pendingDocCommitments={pendingDocs.length}
          capitalClosedLabel={fmtMoney(closedCap)}
          avgDaysToClose={avgClose != null ? String(avgClose) : "—"}
          meetingsCount={meetings.length}
          nextMeeting={meetings[0]}
          tasksDueTodayCount={tasksToday.length}
          engagementTrend={engagementTrend}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <PipelineChart data={pipelineAgg} />
        <OutreachChart data={engagementDaily} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ActivityFeed items={activities} />
        <PriorityTasks
          tasks={openTasks}
          investorNames={investorNames}
          dealNames={dealNames}
          canManage={canManage}
        />
      </section>

      <QuickActions />
    </div>
  );
}
