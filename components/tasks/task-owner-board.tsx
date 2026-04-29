"use client";

import * as React from "react";
import type { Task } from "@/lib/firestore/types";

export function TaskOwnerBoard(props: {
  tasks: Task[];
  memberLabels: Map<string, string>;
}) {
  const buckets = React.useMemo(() => {
    const m = new Map<string, Task[]>();
    const label = new Map<string, string>();
    for (const t of props.tasks) {
      if (t.status !== "open") continue;
      const k = t.assigneeId ?? "__u";
      if (!m.has(k)) {
        m.set(k, []);
        label.set(
          k,
          k === "__u" ? "Unassigned" : props.memberLabels.get(k) ?? `${k.slice(0, 6)}…`,
        );
      }
      m.get(k)!.push(t);
    }
    return { m, label };
  }, [props.tasks, props.memberLabels]);

  const keys = Array.from(buckets.m.keys()).sort((a, b) => {
    if (a === "__u") return 1;
    if (b === "__u") return -1;
    return (buckets.label.get(a) ?? "").localeCompare(buckets.label.get(b) ?? "");
  });

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {keys.map((k) => (
        <div
          key={k}
          className="min-w-[260px] max-w-[320px] flex-1 rounded-2xl border border-border/70 bg-muted/15 shadow-inner"
        >
          <div className="border-b border-border/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {buckets.label.get(k)}
          </div>
          <ul className="max-h-[480px] space-y-2 overflow-y-auto p-2">
            {(buckets.m.get(k) ?? []).map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-border/80 bg-card px-3 py-2 text-xs shadow-sm"
              >
                <p className="font-medium leading-snug">{t.title}</p>
                {t.dueAt ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Due {new Date(t.dueAt).toLocaleDateString()}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
