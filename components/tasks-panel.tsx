"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Task } from "@/lib/firestore/types";

export type TaskRow = {
  id: string;
  title: string;
  dueAt?: number;
  status?: Task["status"];
  linkedInvestorId?: string;
  isInvestorFollowUp?: boolean;
  taskType?: Task["taskType"];
  taskPriority?: Task["taskPriority"];
};

type Props = {
  tasks: TaskRow[];
  canManage: boolean;
  view: "open" | "closed";
};

export function TasksPanel(props: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const isClosedView = props.view === "closed";

  async function completeTask(taskId: string) {
    setPendingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update task");
      toast.success("Task completed");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update task");
    } finally {
      setPendingId(null);
    }
  }

  async function reopenTask(taskId: string) {
    setPendingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "open" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update task");
      toast.success("Task reopened");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update task");
    } finally {
      setPendingId(null);
    }
  }

  async function createTask() {
    const t = title.trim();
    if (!t) {
      toast.error("Title is required");
      return;
    }
    let dueAt: number | undefined;
    if (dueDate.trim()) {
      const d = new Date(dueDate + "T12:00:00");
      const ms = d.getTime();
      if (!Number.isFinite(ms)) {
        toast.error("Invalid due date");
        return;
      }
      dueAt = ms;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, ...(dueAt != null ? { dueAt } : {}) }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create task");
      toast.success("Task created");
      setTitle("");
      setDueDate("");
      setCreateOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create task");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
            <CardTitle className="shrink-0">
              {isClosedView ? "Closed tasks" : "Open tasks"}
            </CardTitle>
            <Link
              href={isClosedView ? "/tasks" : "/tasks?filter=closed"}
              className="text-sm font-normal text-link underline decoration-current/35 underline-offset-4 hover:text-link-hover"
            >
              {isClosedView ? "Show open" : "Show closed"}
            </Link>
          </div>
          {props.canManage && !isClosedView ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              New task
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {props.tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-3 rounded-lg border border-border p-3"
            >
              {isClosedView ? (
                <Checkbox
                  checked={pendingId !== t.id}
                  disabled={pendingId !== null}
                  onCheckedChange={(v) => {
                    if (v === false && pendingId === null) void reopenTask(t.id);
                  }}
                  aria-label={`Reopen task: ${t.title}`}
                />
              ) : (
                <Checkbox
                  checked={pendingId === t.id}
                  disabled={pendingId !== null}
                  onCheckedChange={(v) => {
                    if (v === true && pendingId === null) void completeTask(t.id);
                  }}
                  aria-label={`Mark complete: ${t.title}`}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{t.title}</p>
                  {t.taskType ? (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {t.taskType.replace(/_/g, " ")}
                    </Badge>
                  ) : null}
                  {t.taskPriority ? (
                    <Badge
                      variant={
                        t.taskPriority === "urgent"
                          ? "destructive"
                          : t.taskPriority === "high"
                            ? "default"
                            : "secondary"
                      }
                      className="text-[10px] capitalize"
                    >
                      {t.taskPriority}
                    </Badge>
                  ) : null}
                  {t.isInvestorFollowUp ? (
                    <Badge variant="outline" className="text-[10px]">
                      CRM follow-up
                    </Badge>
                  ) : null}
                  {isClosedView && t.status === "cancelled" ? (
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      Cancelled
                    </Badge>
                  ) : null}
                </div>
                {t.dueAt ? (
                  <p className="text-xs text-muted-foreground">Due {format(t.dueAt, "MMM d, yyyy")}</p>
                ) : null}
                {t.linkedInvestorId ? (
                  <p className="text-xs">
                    <Link
                      href={`/investors/${t.linkedInvestorId}`}
                      className="text-link underline-offset-4 hover:text-link-hover hover:underline"
                    >
                      Investor profile
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>
          ))}
          {props.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isClosedView
                ? "No closed tasks yet."
                : props.canManage
                  ? "No open tasks — add one or wait for scheduled automations."
                  : "No open tasks."}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>Optional due date; otherwise defaults to one week from now.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Follow up with lead investor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Due date (optional)</Label>
              <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void createTask()} disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
