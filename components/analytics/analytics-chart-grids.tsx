"use client";

import type { ReactNode } from "react";
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
import { FunnelChart } from "@/components/dashboard/funnel-chart";

type FunnelDatum = { stage: string; count: number };

export function AnalyticsChartGrids(props: {
  funnel: FunnelDatum[];
  capitalChart: { label: string; total: number }[];
  sourceChart: { name: string; count: number }[];
  campaignPerf: { name: string; sent: number; replied: number }[];
  outreachSidebar: ReactNode;
}) {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelChart data={props.funnel} />
        <Card className="rounded-2xl border-border/80 shadow-md">
          <CardHeader>
            <CardTitle className="font-heading text-base">Capital committed by month</CardTitle>
            <p className="text-xs text-muted-foreground">Active LP commitments (deal_commitments)</p>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={props.capitalChart} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/25" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                    }}
                  />
                  <Bar dataKey="total" fill="var(--chart-1)" radius={[8, 8, 0, 0]} name="USD" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/80 shadow-md">
          <CardHeader>
            <CardTitle className="font-heading text-base">Investors by type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={props.sourceChart} layout="vertical" margin={{ left: 16, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/25" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                    }}
                  />
                  <Bar dataKey="count" fill="var(--chart-3)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        {props.outreachSidebar}
      </div>

      {props.campaignPerf.length > 0 ? (
        <Card className="rounded-2xl border-border/80 shadow-md">
          <CardHeader>
            <CardTitle className="font-heading text-base">Campaigns (top 8)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={props.campaignPerf}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/25" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                    }}
                  />
                  <Bar dataKey="sent" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="replied" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
