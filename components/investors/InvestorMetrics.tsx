"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Flame,
  MessageCircle,
  PiggyBank,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function MetricCard(props: {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  micro: string;
  accent?: "default" | "positive" | "amber" | "danger";
  delay?: number;
}) {
  const accentClass =
    props.accent === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : props.accent === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : props.accent === "danger"
          ? "text-red-600 dark:text-red-400"
          : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: props.delay ?? 0 }}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-2 text-primary">{props.icon}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {props.title}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {props.value}
      </p>
      <p className={cn("mt-1 text-xs leading-snug", accentClass)}>{props.micro}</p>
    </motion.div>
  );
}

export function InvestorMetrics(props: {
  totalInvestors: number;
  activeConversations: number;
  weightedPipeline: number;
  hotProspects: number;
  meetingsScheduled: number;
  committedCapital: number;
  totalTrend: { pct: number | null; label: string };
  className?: string;
}) {
  const trendAccent =
    props.totalTrend.pct == null
      ? "default"
      : props.totalTrend.pct >= 0
        ? "positive"
        : "amber";

  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
        props.className,
      )}
    >
      <MetricCard
        delay={0}
        icon={<Users className="size-4" />}
        title="Total Investors"
        value={props.totalInvestors.toLocaleString()}
        micro={props.totalTrend.label}
        accent={trendAccent}
      />
      <MetricCard
        delay={0.04}
        icon={<MessageCircle className="size-4" />}
        title="Active Conversations"
        value={props.activeConversations.toLocaleString()}
        micro="Mid-funnel stages"
        accent="default"
      />
      <MetricCard
        delay={0.08}
        icon={<TrendingUp className="size-4" />}
        title="Weighted Pipeline"
        value={fmtUsd(props.weightedPipeline)}
        micro="Score × check midpoint"
        accent="positive"
      />
      <MetricCard
        delay={0.12}
        icon={<Flame className="size-4" />}
        title="Hot Prospects"
        value={props.hotProspects.toLocaleString()}
        micro="Score 80+"
        accent="positive"
      />
      <MetricCard
        delay={0.16}
        icon={<CalendarClock className="size-4" />}
        title="Meetings Scheduled"
        value={props.meetingsScheduled.toLocaleString()}
        micro="In meeting stage"
        accent="default"
      />
      <MetricCard
        delay={0.2}
        icon={<PiggyBank className="size-4" />}
        title="Committed Capital"
        value={fmtUsd(props.committedCapital)}
        micro="Recorded on profiles"
        accent="positive"
      />
    </div>
  );
}
