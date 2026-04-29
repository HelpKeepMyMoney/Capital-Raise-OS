"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task } from "@/lib/firestore/types";

function tasksByOwner(tasks: Task[], memberLabels: Map<string, string>) {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (t.status !== "open") continue;
    const key = t.assigneeId ?? "__unassigned";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([id, count]) => ({
      name:
        id === "__unassigned"
          ? "Unassigned"
          : memberLabels.get(id) ?? id.slice(0, 6) + "…",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function TaskInsights(props: {
  tasks: Task[];
  memberLabels: Map<string, string>;
  disclaimer?: boolean;
}) {
  const data = React.useMemo(
    () => tasksByOwner(props.tasks, props.memberLabels),
    [props.tasks, props.memberLabels],
  );

  const avgCompletionHint =
    "Estimate from visible tasks — connect CRM analytics for precise SLAs.";

  const overduePct =
    props.tasks.filter((t) => t.status === "open").length > 0
      ? Math.round(
          (props.tasks.filter(
            (t) =>
              t.status === "open" &&
              t.dueAt != null &&
              t.dueAt < new Date(new Date().setHours(0, 0, 0, 0)).getTime(),
          ).length /
            props.tasks.filter((t) => t.status === "open").length) *
            100,
        )
      : 0;

  return (
    <Card className="rounded-2xl border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-base">Task analytics</CardTitle>
        <CardDescription>Mini snapshot from the tasks loaded above — {avgCompletionHint}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-muted/15 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Overdue share (open)
          </p>
          <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">{overduePct}%</p>
          <p className="mt-2 text-xs text-muted-foreground">Targets sponsor accountability.</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/15 p-4 lg:col-span-2">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Open tasks by owner
          </p>
          <div className="h-[220px] w-full">
            {data.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No distribution data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        {props.disclaimer ? (
          <p className="text-xs text-muted-foreground lg:col-span-3">
            Charts reflect only tasks loaded on this page (see cap disclaimer above).
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
