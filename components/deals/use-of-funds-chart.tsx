"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DealUseOfFundsSplit } from "@/lib/firestore/types";
import { cn } from "@/lib/utils";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export function UseOfFundsChart(props: {
  split?: DealUseOfFundsSplit[];
  proseFallback?: string;
  className?: string;
}) {
  const split = props.split?.filter((s) => s.label.trim() && s.pct > 0) ?? [];
  const data = split.map((s) => ({ name: s.label, value: s.pct }));

  if (data.length === 0) {
    if (!props.proseFallback?.trim()) return null;
    return (
      <section className={cn("rounded-2xl border border-border/80 bg-card p-6 shadow-sm", props.className)}>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Use of funds</h2>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {props.proseFallback}
        </p>
      </section>
    );
  }

  return (
    <section className={cn("rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:p-8", props.className)}>
      <h2 className="font-heading text-2xl font-bold tracking-tight">Use of funds</h2>
      <p className="mt-1 text-sm text-muted-foreground">How capital will be deployed.</p>
      <div className="mt-6 grid gap-8 md:grid-cols-2 md:items-center">
        <ol className="space-y-3 text-sm">
          {split.map((s, i) => (
            <li key={s.label} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                {s.label}
              </span>
              <span className="font-semibold tabular-nums">{s.pct}%</span>
            </li>
          ))}
        </ol>
        <div className="h-56 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={88}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]!} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v ?? 0}%`, "Share"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
