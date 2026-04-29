"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Flame,
  TrendingUp,
  Users,
} from "lucide-react";
import type { TaskMetricsPack } from "@/lib/tasks/metrics";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  metrics: TaskMetricsPack;
  /** True when task lists may be capped — show hint under grid */
  metricsCapped?: boolean;
};

function trendPct(current: number, prev: number): string | null {
  if (prev === 0 && current === 0) return null;
  if (prev === 0) return "—";
  const pct = Math.round(((current - prev) / prev) * 100);
  return `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs last week`;
}

export function TaskMetrics(props: Props) {
  const { metrics } = props;
  const cardBase =
    "rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md";

  const completedTrend = trendPct(metrics.completedThisWeekCount, metrics.completedPrevWeekCount);

  const items = [
    {
      key: "open",
      label: "Open Tasks",
      value: metrics.openCount,
      hint: "Across your workspace load",
      icon: CircleDot,
      tone: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "today",
      label: "Due Today",
      value: metrics.dueTodayCount,
      hint: "Scheduled for today",
      icon: CalendarClock,
      tone: "text-slate-700 dark:text-slate-200",
    },
    {
      key: "overdue",
      label: "Overdue",
      value: metrics.overdueCount,
      hint:
        metrics.overdueCount > 0
          ? `${metrics.overdueCount} may need rescheduling`
          : "Nothing overdue",
      icon: AlertTriangle,
      tone: "text-red-600 dark:text-red-400",
    },
    {
      key: "done",
      label: "Completed This Week",
      value: metrics.completedThisWeekCount,
      hint: completedTrend ?? "Weekly throughput",
      icon: CheckCircle2,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "ifu",
      label: "Investor Follow Ups",
      value: metrics.investorFollowUpCount,
      hint: "CRM-linked open tasks",
      icon: Users,
      tone: "text-indigo-600 dark:text-indigo-400",
    },
    {
      key: "close",
      label: "Deal Closing Tasks",
      value: metrics.dealClosingCount,
      hint: "Docs, review, closing prep",
      icon: Flame,
      tone: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {items.map((item, i) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
          >
            <Card className={cardBase}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="font-heading text-2xl font-semibold tabular-nums">{item.value}</p>
                    <p className="text-xs leading-snug text-muted-foreground">{item.hint}</p>
                  </div>
                  <item.icon className={`size-5 shrink-0 opacity-90 ${item.tone}`} aria-hidden />
                </div>
                {item.key === "done" && completedTrend ? (
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <TrendingUp className="size-3.5" aria-hidden />
                    {completedTrend}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      {props.metricsCapped ? (
        <p className="text-xs text-muted-foreground">
          Showing up to the latest tasks loaded for this org; counts may be incomplete over ~80 open or closed items until pagination ships.
        </p>
      ) : null}
    </div>
  );
}
