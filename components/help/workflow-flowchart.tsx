"use client";

import { cn } from "@/lib/utils";

const steps = [
  { key: "org", label: "Organization" },
  { key: "profile", label: "Your profile" },
  { key: "esign", label: "E-sign" },
  { key: "deal", label: "Deal room" },
  { key: "droom", label: "Data room" },
  { key: "tasks", label: "Tasks" },
] as const;

export function WorkflowFlowchart(props: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-muted/30 px-4 py-5 shadow-sm",
        props.className,
      )}
      aria-label="Recommended setup order"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setup flow</p>
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
        {steps.map((s, i) => (
          <span key={s.key} className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">{s.label}</span>
            {i < steps.length - 1 ? (
              <span className="text-muted-foreground" aria-hidden>
                →
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
