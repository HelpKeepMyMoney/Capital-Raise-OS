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
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-bold">Conversion funnel</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full min-w-0" style={{ height: 288 }}>
          <ResponsiveContainer width="100%" height={288} minWidth={0}>
            <BarChart data={chart} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" />
                  <stop offset="100%" stopColor="var(--chart-2)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={64} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(15,15,15,0.92)",
                }}
              />
              <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
