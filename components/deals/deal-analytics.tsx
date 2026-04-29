"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DealAnalyticsDTO = {
  interestCount: number;
  activeInviteCount: number;
  commitments: { count: number; total: number; avg: number };
  telemetry: { pageViews: number; uniqueVisitors: number; byEvent: { event: string; count: number }[] };
};

export function DealAnalytics(props: { data: DealAnalyticsDTO; className?: string }) {
  const { data } = props;
  const chartData = data.telemetry.byEvent.filter((x) => x.event !== "page_view");

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Page views" value={String(data.telemetry.pageViews)} />
        <Stat label="Unique visitors" value={String(data.telemetry.uniqueVisitors)} />
        <Stat label="Interested (CRM)" value={String(data.interestCount)} />
        <Stat label="Open invites" value={String(data.activeInviteCount)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Commitments" value={String(data.commitments.count)} />
        <Stat label="Amount committed" value={`$${data.commitments.total.toLocaleString()}`} />
        <Stat label="Avg check" value={`$${Math.round(data.commitments.avg).toLocaleString()}`} />
      </div>
      {chartData.length > 0 ? (
        <div className="h-64 rounded-2xl border border-border/80 bg-card p-4">
          <p className="mb-2 text-sm font-medium">CTA engagement</p>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="event" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          CTA events will appear as investors interact with this offering page.
        </p>
      )}
    </div>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
      <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{props.value}</p>
    </div>
  );
}
