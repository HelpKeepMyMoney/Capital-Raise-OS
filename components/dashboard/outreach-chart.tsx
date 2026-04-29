"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OutreachChart(props: { data: { label: string; sent: number; replies: number }[] }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-bold">Weekly outreach performance</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full min-w-0" style={{ height: 288 }}>
          <ResponsiveContainer width="100%" height={288} minWidth={0}>
            <AreaChart data={props.data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="sent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(15,15,15,0.92)",
                }}
              />
              <Area type="monotone" dataKey="sent" stroke="var(--chart-1)" fill="url(#sent)" />
              <Area type="monotone" dataKey="replies" stroke="var(--chart-2)" fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
