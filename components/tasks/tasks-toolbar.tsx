"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import type { TaskPriority } from "@/lib/firestore/types";
import { cn } from "@/lib/utils";

export type WorkspaceSegment =
  | "my"
  | "team"
  | "investor"
  | "closing"
  | "completed";

export type ViewMode = "list" | "kanban" | "calendar" | "owner";

export type TasksToolbarProps = {
  segment: WorkspaceSegment;
  onSegmentChange: (v: WorkspaceSegment) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  search: string;
  onSearchChange: (v: string) => void;
  priorityFilter: TaskPriority | "all";
  onPriorityFilterChange: (v: TaskPriority | "all") => void;
  ownerFilter: string | "all";
  onOwnerFilterChange: (v: string | "all") => void;
  memberOptions: { userId: string; label: string }[];
  onScrollAutomations?: () => void;
};

const segmentBtn =
  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm border border-transparent";

export function TasksToolbar(props: TasksToolbarProps) {
  const segments: { id: WorkspaceSegment; label: string }[] = [
    { id: "my", label: "My Tasks" },
    { id: "team", label: "Team Tasks" },
    { id: "investor", label: "Investor Follow Ups" },
    { id: "closing", label: "Deal Closings" },
    { id: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {segments.map((s) => (
          <button
            key={s.id}
            type="button"
            className={cn(
              segmentBtn,
              props.segment === s.id
                ? "border-primary/30 bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
            onClick={() => props.onSegmentChange(s.id)}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          className={cn(segmentBtn, "bg-muted/40 text-muted-foreground hover:bg-muted")}
          onClick={props.onScrollAutomations}
        >
          Automations
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["list", "List"],
              ["kanban", "Kanban"],
              ["calendar", "Calendar"],
              ["owner", "By owner"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => props.onViewModeChange(id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                props.viewMode === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/80 text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px] flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={props.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder="Search tasks, investors, deals…"
            className="rounded-xl border-border/80 bg-background pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={props.priorityFilter}
          onValueChange={(v) =>
            props.onPriorityFilterChange((v ?? "all") as TaskPriority | "all")
          }
        >
          <SelectTrigger className="h-9 w-[140px] rounded-xl border-border/80">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={props.ownerFilter}
          onValueChange={(v) => props.onOwnerFilterChange(v ?? "all")}
        >
          <SelectTrigger className="h-9 w-[160px] rounded-xl border-border/80">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {props.memberOptions.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
