"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Zap, ListChecks } from "lucide-react";

type Props = {
  canManage: boolean;
  onNewTask: () => void;
  onBulkActions?: () => void;
  onScrollAutomations?: () => void;
};

export function TasksHeader(props: Props) {
  return (
    <header className="flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">Tasks</h1>
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          Execution center for follow ups, closings, diligence, and workflow actions across your raise.
        </p>
      </div>
      <div className="flex flex-shrink-0 flex-wrap gap-2">
        {props.canManage ? (
          <>
            <Button className="rounded-xl shadow-sm" type="button" onClick={props.onNewTask}>
              New Task
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-border/80"
              type="button"
              onClick={props.onBulkActions ?? (() => {})}
            >
              <ListChecks className="mr-1.5 size-4" aria-hidden />
              Bulk Actions
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-border/80"
              type="button"
              onClick={props.onScrollAutomations ?? (() => {})}
            >
              <Zap className="mr-1.5 size-4" aria-hidden />
              Automations
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}
