"use client";

import {
  Users,
  MessageCircle,
  TrendingUp,
  HandCoins,
  Wallet,
  Timer,
  CalendarClock,
  ListTodo,
} from "lucide-react";
import { MetricCard, type MetricTrend } from "@/components/dashboard/metric-card";
import { format } from "date-fns";
import type { Meeting } from "@/lib/firestore/types";

export function DashboardKpiGrid(props: {
  investorsCount: number;
  activeConversations: number;
  weightedPipelineLabel: string;
  qualifiedProspectCount: number;
  capitalCommittedLabel: string;
  pendingDocCommitments: number;
  capitalClosedLabel: string;
  avgDaysToClose: string;
  meetingsCount: number;
  nextMeeting: Meeting | undefined;
  tasksDueTodayCount: number;
  engagementTrend: MetricTrend | null;
}) {
  const nextMicro = props.nextMeeting
    ? `Next: ${format(props.nextMeeting.startsAt, "EEE MMM d, h:mm a")}`
    : "Schedule from tasks or CRM";

  const committedMicro =
    props.pendingDocCommitments > 0
      ? `${props.pendingDocCommitments} pending subscription doc${props.pendingDocCommitments === 1 ? "" : "s"}`
      : "Docs complete";

  const tasksMicro =
    props.tasksDueTodayCount === 0
      ? "Best streak: inbox clear"
      : `${props.tasksDueTodayCount} due today — stay ahead`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total investors"
          value={String(props.investorsCount)}
          micro="Active CRM relationships"
          icon={Users}
          href="/investors"
          delay={0}
        />
        <MetricCard
          title="Active conversations"
          value={String(props.activeConversations)}
          micro="Contacted through diligence"
          icon={MessageCircle}
          href="/investors?filter=active"
          delay={0.04}
          trend={props.engagementTrend}
        />
        <MetricCard
          title="Weighted pipeline"
          value={props.weightedPipelineLabel}
          micro={`${props.qualifiedProspectCount} qualified prospect${props.qualifiedProspectCount === 1 ? "" : "s"}`}
          icon={TrendingUp}
          href="/investors"
          variant="gold"
          delay={0.08}
        />
        <MetricCard
          title="Capital committed"
          value={props.capitalCommittedLabel}
          micro={committedMicro}
          icon={HandCoins}
          href="/investors?stage=committed"
          variant="success"
          delay={0.12}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Capital closed"
          value={props.capitalClosedLabel}
          micro="Wired & closed in CRM"
          icon={Wallet}
          href="/investors?stage=closed"
          variant="success"
          delay={0.05}
        />
        <MetricCard
          title="Avg. days to close"
          value={props.avgDaysToClose}
          micro="Closed investors, created to updated"
          icon={Timer}
          href="/analytics"
          delay={0.1}
        />
        <MetricCard
          title="Meetings scheduled"
          value={String(props.meetingsCount)}
          micro={nextMicro}
          icon={CalendarClock}
          href="/tasks"
          delay={0.15}
        />
        <MetricCard
          title="Tasks due today"
          value={String(props.tasksDueTodayCount)}
          micro={tasksMicro}
          icon={ListTodo}
          href="/tasks?due=today"
          variant={props.tasksDueTodayCount > 0 ? "danger" : "default"}
          delay={0.2}
        />
      </div>
    </div>
  );
}
