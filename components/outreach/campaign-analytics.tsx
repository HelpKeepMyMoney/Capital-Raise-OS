"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OutreachFunnel, OutreachTimeSeriesPoint } from "@/lib/outreach/analytics";

export function CampaignAnalytics(props: {
  funnel: OutreachFunnel;
  timeSeries: OutreachTimeSeriesPoint[];
}) {
  const funnelData = [
    { stage: "Recipients", count: props.funnel.recipients },
    { stage: "Sent", count: props.funnel.sent },
    { stage: "Opened", count: props.funnel.opened },
    { stage: "Clicked", count: props.funnel.clicked },
    { stage: "Replied", count: props.funnel.replied },
    { stage: "Meetings", count: props.funnel.meetingsBooked },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-base">Campaign funnel</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/25" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="stage" width={80} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-base">Engagement over time</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={props.timeSeries} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/25" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9 }}
                tickFormatter={(v) => (typeof v === "string" && v.length >= 10 ? v.slice(5) : v)}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="sent" stroke="var(--chart-1)" dot={false} />
              <Line type="monotone" dataKey="opened" stroke="var(--chart-2)" dot={false} />
              <Line type="monotone" dataKey="replied" stroke="var(--chart-3)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
