"use client";

import { motion } from "framer-motion";
import type { DealTractionMetric } from "@/lib/firestore/types";
import { cn } from "@/lib/utils";

export function TractionSection(props: {
  metrics?: DealTractionMetric[];
  className?: string;
}) {
  const m = props.metrics?.filter((x) => x.label.trim() && x.value.trim()) ?? [];

  if (m.length === 0) {
    return (
      <section className={cn("rounded-2xl border border-dashed border-border/80 bg-card/50 p-8", props.className)}>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Traction</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add traction metrics in deal settings to showcase momentum (revenue, users, growth, partnerships).
        </p>
      </section>
    );
  }

  return (
    <section className={cn("space-y-6", props.className)}>
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Traction</h2>
        <p className="mt-1 text-sm text-muted-foreground">Key quantitative milestones.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {m.map((row, i) => (
          <motion.div
            key={`${row.label}-${i}`}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {row.label}
            </p>
            <p className="mt-2 font-heading text-2xl font-bold tabular-nums tracking-tight">
              {row.value}
            </p>
            {row.hint ?
              <p className="mt-1 text-xs text-muted-foreground">{row.hint}</p>
            : null}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
