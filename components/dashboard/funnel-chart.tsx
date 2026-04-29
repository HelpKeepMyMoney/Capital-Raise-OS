"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const labels: Record<string, string> = {
  lead: "Lead",
  researching: "Research",
  contacted: "Contacted",
  responded: "Responded",
  meeting_scheduled: "Meeting",
  data_room_opened: "Data room",
  due_diligence: "Diligence",
  soft_circled: "Soft circle",
  committed: "Committed",
  closed: "Closed",
  declined: "Declined",
};

export function FunnelChart(props: { data: { stage: string; count: number }[] }) {
  const chart = props.data.map((d) => ({
    name: labels[d.stage] ?? d.stage,
    count: d.count,
  }));

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-md">
      <CardHeader>
        <CardTitle className="font-heading text-base font-semibold">Conversion funnel</CardTitle>
        <p className="text-xs text-muted-foreground">Investors by stage — spot leakage before it compounds.</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full min-w-0" style={{ height: 288 }}>
          <ResponsiveContainer width="100%" height={288} minWidth={0}>
            <BarChart data={chart} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-4)" />
                  <stop offset="100%" stopColor="var(--chart-1)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/25" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} angle={-25} textAnchor="end" height={64} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                  boxShadow: "0 8px 30px rgb(0 0 0 / 0.08)",
                }}
              />
              <Bar dataKey="count" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
