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
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PipelineAggregateRow } from "@/lib/dashboard/pipeline-aggregate";

export function PipelineChart(props: { data: PipelineAggregateRow[] }) {
  const chart = props.data.map((d) => ({
    name: d.label,
    count: d.count,
    conversion: d.conversionFromPrior,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="h-full rounded-2xl border-border/80 bg-card shadow-md transition-shadow duration-200 hover:shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base font-semibold">Pipeline funnel</CardTitle>
          <p className="text-xs text-muted-foreground">
            Stages rolled up from CRM — hover for volume and step conversion.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="w-full min-w-0" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height={320} minWidth={0}>
              <BarChart layout="vertical" data={chart} margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="pipeFunnelGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/25" horizontal />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={92}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as {
                      name: string;
                      count: number;
                      conversion: number | null;
                    };
                    return (
                      <div
                        className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg"
                        style={{ boxShadow: "0 8px 30px rgb(0 0 0 / 0.08)" }}
                      >
                        <p className="font-semibold text-foreground">{row.name}</p>
                        <p className="mt-1 text-muted-foreground">
                          {row.count} investor{row.count === 1 ? "" : "s"}
                        </p>
                        {row.conversion != null && row.name !== "Lead" ? (
                          <p className="mt-1 text-muted-foreground">
                            {row.conversion}% vs prior stage
                          </p>
                        ) : null}
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="url(#pipeFunnelGrad)"
                  radius={[0, 8, 8, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
