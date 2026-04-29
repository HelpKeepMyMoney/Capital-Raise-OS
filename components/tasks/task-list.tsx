"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Task } from "@/lib/firestore/types";
import { TaskRow } from "@/components/tasks/task-row";

export type TaskListProps = {
  tasks: Task[];
  resolveRelated: (task: Task) => { label?: string; href?: string };
  resolveOwner: (task: Task) => string;
  resolveCreator: (task: Task) => string;
  isCompletedView: boolean;
  pendingId: string | null;
  canManage: boolean;
  onToggleComplete: (id: string) => void;
  onToggleReopen: (id: string) => void;
  onOpenTask: (task: Task) => void;
  onSnooze: (task: Task) => void;
  onReassign: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskList(props: TaskListProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="border-border/80 hover:bg-transparent">
            <TableHead className="w-10 px-1" />
            <TableHead className="min-w-[9rem] w-[20%]">Task Title</TableHead>
            <TableHead className="w-[5.5rem]">Priority</TableHead>
            <TableHead className="min-w-[8rem] w-[22%]">Related</TableHead>
            <TableHead className="min-w-[7rem] w-[16%]">Owner</TableHead>
            <TableHead className="w-[6.5rem]">Due Date</TableHead>
            <TableHead className="w-[7rem]">Status</TableHead>
            <TableHead className="min-w-[7rem] w-[14%]">Created By</TableHead>
            <TableHead className="w-11 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.tasks.map((task) => {
            const rel = props.resolveRelated(task);
            return (
              <TaskRow
                key={task.id}
                task={task}
                relatedLabel={rel.label}
                relatedHref={rel.href}
                ownerLabel={props.resolveOwner(task)}
                creatorLabel={props.resolveCreator(task)}
                isCompletedView={props.isCompletedView}
                pendingId={props.pendingId}
                canManage={props.canManage}
                onToggleComplete={() => props.onToggleComplete(task.id)}
                onToggleReopen={() => props.onToggleReopen(task.id)}
                onOpen={() => props.onOpenTask(task)}
                onSnooze={() => props.onSnooze(task)}
                onReassign={() => props.onReassign(task)}
                onDelete={() => props.onDelete(task)}
                onOpenRelated={() => {
                  if (rel.href) window.location.href = rel.href;
                }}
              />
            );
          })}
        </TableBody>
      </Table>
      {props.tasks.length === 0 ? (
        <p className="border-t border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
          No tasks match this view.
        </p>
      ) : null}
    </div>
  );
}
