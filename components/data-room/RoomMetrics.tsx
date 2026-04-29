"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DataRoomMetricsDTO } from "@/lib/data-room/metrics";
import {
  Building2,
  FileStack,
  Eye,
  ClipboardSignature,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  metrics: DataRoomMetricsDTO;
};

function MetricCell(props: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number | null;
  micro?: string;
  delay?: number;
}) {
  const trendGood = props.trend != null && props.trend >= 0;
  const trendTxt =
    props.trend != null ? `${props.trend >= 0 ? "↑" : "↓"} ${Math.abs(props.trend)}% vs last week` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: (props.delay ?? 0) * 0.04 }}
    >
      <Card className="rounded-2xl border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-4 pt-5">
          <div className="flex items-start justify-between gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">{props.icon}</div>
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{props.label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{props.value}</p>
          {trendTxt ? (
            <p className={cn("mt-1 text-xs tabular-nums", trendGood ? "text-emerald-600" : "text-amber-600")}>
              {trendTxt}
            </p>
          ) : null}
          {props.micro ? <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{props.micro}</p> : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function RoomMetrics(props: Props) {
  const { metrics } = props;
  const most = metrics.mostViewedRoom;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <MetricCell
        icon={<Building2 className="h-4 w-4" />}
        label="Active Rooms"
        value={metrics.activeRooms}
        delay={0}
      />
      <MetricCell icon={<FileStack className="h-4 w-4" />} label="Documents" value={metrics.totalDocuments} delay={1} />
      <MetricCell
        icon={<Eye className="h-4 w-4" />}
        label="Opens (Week)"
        value={metrics.investorViewsThisWeek}
        trend={metrics.investorViewsTrendPct}
        delay={2}
      />
      <MetricCell
        icon={<ClipboardSignature className="h-4 w-4" />}
        label="NDAs Pending"
        value={metrics.ndasPending === 0 ? "—" : metrics.ndasPending}
        delay={3}
        micro="SignWell integration — workflow tracked here soon."
      />
      <MetricCell
        icon={<TrendingUp className="h-4 w-4" />}
        label="Hot Room"
        value={most ? most.name.slice(0, 18) + (most.name.length > 18 ? "…" : "") : "—"}
        micro={most ? `${most.views.toLocaleString()} tracked views (docs)` : "Link rooms to deals to prioritize."}
        delay={4}
      />
      <MetricCell
        icon={<UsersRound className="h-4 w-4" />}
        label="Invitations"
        value={metrics.invitedInvestorsCount}
        delay={5}
        micro="Active / unexpired invite rows."
      />
    </div>
  );
}
