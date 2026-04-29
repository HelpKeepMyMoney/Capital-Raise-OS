"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/firestore/types";
import { cn } from "@/lib/utils";

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function priorityVariant(p?: Task["taskPriority"]): "default" | "secondary" | "destructive" | "outline" {
  if (p === "urgent") return "destructive";
  if (p === "high") return "secondary";
  return "outline";
}

export function PriorityTasks(props: {
  tasks: Task[];
  investorNames: Record<string, string>;
  dealNames: Record<string, string>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const top = React.useMemo(() => {
    const open = props.tasks.filter((t) => t.status === "open");
    return [...open]
      .sort((a, b) => {
        const pa = priorityOrder[a.taskPriority ?? "medium"] ?? 2;
        const pb = priorityOrder[b.taskPriority ?? "medium"] ?? 2;
        if (pa !== pb) return pa - pb;
        const ad = a.dueAt ?? a.createdAt;
        const bd = b.dueAt ?? b.createdAt;
        return ad - bd;
      })
      .slice(0, 5);
  }, [props.tasks]);

  async function complete(taskId: string) {
    if (!props.canManage) return;
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

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="rounded-2xl border-border/80 bg-card shadow-md transition-shadow duration-200 hover:shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base font-semibold">Priority tasks</CardTitle>
          <p className="text-xs text-muted-foreground">Top actionable items — check off when done.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks. Inbox clear.</p>
          ) : (
            top.map((t, i) => {
              const related =
                t.linkedInvestorId && props.investorNames[t.linkedInvestorId]
                  ? { href: `/investors/${t.linkedInvestorId}`, label: props.investorNames[t.linkedInvestorId] }
                  : t.linkedDealId && props.dealNames[t.linkedDealId]
                    ? { href: `/deals/${t.linkedDealId}`, label: props.dealNames[t.linkedDealId] }
                    : null;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5"
                >
                  <Checkbox
                    checked={false}
                    disabled={!props.canManage || pendingId === t.id}
                    className="mt-0.5"
                    onCheckedChange={(v) => {
                      if (v === true && pendingId === null) void complete(t.id);
                    }}
                    aria-label={`Complete ${t.title}`}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium leading-snug text-foreground">{t.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {t.dueAt != null ? (
                        <span>Due {format(t.dueAt, "MMM d, yyyy")}</span>
                      ) : (
                        <span>No due date</span>
                      )}
                      {t.taskPriority ? (
                        <Badge
                          variant={priorityVariant(t.taskPriority)}
                          className={cn(
                            "h-5 px-1.5 text-[10px] font-semibold capitalize",
                            t.taskPriority === "medium" && "border-warning/40 bg-warning/15 text-foreground",
                          )}
                        >
                          {t.taskPriority}
                        </Badge>
                      ) : null}
                    </div>
                    {related ? (
                      <Link
                        href={related.href}
                        className="inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {related.label}
                      </Link>
                    ) : null}
                  </div>
                </motion.div>
              );
            })
          )}
          <Link
            href="/tasks"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full justify-center rounded-xl",
            )}
          >
            View all tasks
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
