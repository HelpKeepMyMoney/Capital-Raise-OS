"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";
import type { Task } from "@/lib/firestore/types";
import { PRIORITY_LABEL, WORKFLOW_LABEL, priorityBadgeClass } from "@/lib/tasks/ui-labels";
import { cn } from "@/lib/utils";

export type TaskRowProps = {
  task: Task;
  relatedLabel?: string;
  relatedHref?: string;
  ownerLabel: string;
  creatorLabel: string;
  isCompletedView: boolean;
  pendingId: string | null;
  canManage: boolean;
  onToggleComplete: () => void;
  onToggleReopen: () => void;
  onOpen: () => void;
  onSnooze: () => void;
  onReassign: () => void;
  onDelete: () => void;
  onOpenRelated?: () => void;
};

function statusLabel(task: Task): string {
  if (task.status === "done") return "Completed";
  if (task.status === "cancelled") return "Archived";
  const w = task.workflowStatus;
  return w ? WORKFLOW_LABEL[w] : "Not Started";
}

export function TaskRow(props: TaskRowProps) {
  const { task } = props;
  const overdue =
    task.status === "open" &&
    task.dueAt != null &&
    task.dueAt < new Date(new Date().setHours(0, 0, 0, 0)).getTime();

  return (
    <TableRow
      className={cn(
        "group border-border/60 transition-colors hover:bg-muted/40",
        overdue ? "bg-red-500/[0.04]" : "",
      )}
    >
      <TableCell className="w-10 px-1 align-middle">
        {props.isCompletedView ? (
          <Checkbox
            checked={props.pendingId !== task.id}
            disabled={props.pendingId !== null}
            onCheckedChange={(v) => {
              if (v === false && props.pendingId === null) props.onToggleReopen();
            }}
            aria-label={`Reopen task: ${task.title}`}
          />
        ) : (
          <Checkbox
            checked={props.pendingId === task.id}
            disabled={props.pendingId !== null}
            onCheckedChange={(v) => {
              if (v === true && props.pendingId === null) props.onToggleComplete();
            }}
            aria-label={`Mark complete: ${task.title}`}
          />
        )}
      </TableCell>
      <TableCell className="min-w-0 align-top font-medium whitespace-normal">
        <button
          type="button"
          className="line-clamp-2 w-full text-left text-sm leading-snug hover:underline"
          title={task.title}
          onClick={props.onOpen}
        >
          {task.title}
        </button>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {task.taskPriority ? (
          <Badge variant="outline" className={cn("text-[10px] font-semibold", priorityBadgeClass(task.taskPriority))}>
            {PRIORITY_LABEL[task.taskPriority]}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="min-w-0 overflow-hidden align-top">
        {props.relatedLabel ? (
          props.relatedHref ? (
            <Link
              href={props.relatedHref}
              className="block truncate text-xs text-primary hover:underline"
              title={props.relatedLabel}
            >
              {props.relatedLabel}
            </Link>
          ) : (
            <span className="block truncate text-xs" title={props.relatedLabel}>
              {props.relatedLabel}
            </span>
          )
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="min-w-0 overflow-hidden align-top text-xs">
        <span className="block truncate" title={props.ownerLabel}>
          {props.ownerLabel}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs tabular-nums">
        {task.dueAt ? (
          <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
            {format(task.dueAt, "MMM d, yyyy")}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">{statusLabel(task)}</TableCell>
      <TableCell className="min-w-0 overflow-hidden align-top text-xs text-muted-foreground">
        <span className="block truncate" title={props.creatorLabel}>
          {props.creatorLabel}
        </span>
      </TableCell>
      <TableCell className="w-11 whitespace-nowrap text-right">
        {props.canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "size-8 rounded-lg",
              )}
              aria-label="Actions"
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              {!props.isCompletedView ? (
                <DropdownMenuItem onClick={props.onToggleComplete}>Complete</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={props.onToggleReopen}>Reopen</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={props.onSnooze}>Snooze 7 days</DropdownMenuItem>
              <DropdownMenuItem onClick={props.onReassign}>Reassign…</DropdownMenuItem>
              <DropdownMenuItem onClick={props.onOpen}>Edit…</DropdownMenuItem>
              {props.onOpenRelated && (props.relatedHref || task.linkedInvestorId || task.linkedDealId) ? (
                <DropdownMenuItem onClick={props.onOpenRelated}>Open related record</DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={props.onDelete}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
