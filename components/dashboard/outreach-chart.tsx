"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardEngagementDay } from "@/lib/firestore/queries";

type Range = "7d" | "30d" | "90d";

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function OutreachChart(props: { data: DashboardEngagementDay[] }) {
  const [range, setRange] = React.useState<Range>("30d");
  const days = RANGE_DAYS[range];
  const sliced = props.data.slice(-days);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
    >
      <Card className="h-full rounded-2xl border-border/80 bg-card shadow-md transition-shadow duration-200 hover:shadow-lg">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="font-heading text-base font-semibold">Outreach performance</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Emails sent, replies, and meetings booked.
            </p>
          </div>
          <div className="flex gap-1 rounded-full border border-border/80 bg-muted/40 p-0.5">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  range === r
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r === "7d" ? "7d" : r === "30d" ? "30d" : "90d"}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="w-full min-w-0" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height={320} minWidth={0}>
              <LineChart data={sliced} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="outSentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/25" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => (typeof v === "string" && v.length >= 10 ? v.slice(5) : v)}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    boxShadow: "0 8px 30px rgb(0 0 0 / 0.08)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sent"
                  name="Sent"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="replies"
                  name="Replies"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="meetingsBooked"
                  name="Meetings booked"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
