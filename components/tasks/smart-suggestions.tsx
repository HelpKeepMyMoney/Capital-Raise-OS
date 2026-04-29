"use client";

import * as React from "react";
import { Lightbulb } from "lucide-react";
import type { SmartSuggestion } from "@/lib/tasks/smart-suggestions";

export function SmartSuggestionsBar(props: { suggestions: SmartSuggestion[] }) {
  if (props.suggestions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="size-4 text-amber-700 dark:text-amber-300" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">Smart suggestions</h2>
      </div>
      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {props.suggestions.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-border/60 bg-card px-3 py-2 text-xs shadow-sm"
          >
            <p className="font-medium text-foreground">{s.title}</p>
            <p className="mt-1 leading-snug text-muted-foreground">{s.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
