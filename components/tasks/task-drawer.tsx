"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Task, TaskType } from "@/lib/firestore/types";
import { PRIORITY_LABEL, WORKFLOW_LABEL } from "@/lib/tasks/ui-labels";
import { cn } from "@/lib/utils";

type MemberOpt = { userId: string; label: string };
type RelOpt = { id: string; name: string };

type CommentRow = {
  id: string;
  authorId: string;
  body: string;
  createdAt: number;
};

export function TaskDrawer(props: {
  task: Task | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: MemberOpt[];
  investors: RelOpt[];
  deals: RelOpt[];
  dataRooms: RelOpt[];
  memberLabels: Map<string, string>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [comments, setComments] = React.useState<CommentRow[]>([]);
  const [loadingComments, setLoadingComments] = React.useState(false);
  const [commentBody, setCommentBody] = React.useState("");
  const [posting, setPosting] = React.useState(false);

  React.useEffect(() => {
    if (!props.open || !props.task) return;
    const taskId = props.task.id;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoadingComments(true);
    });
    fetch(`/api/tasks/${taskId}/comments`)
      .then((r) => r.json())
      .then((data: { comments?: CommentRow[] }) => {
        if (!cancelled) setComments(data.comments ?? []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [props.open, props.task]);

  async function patch(body: Record<string, unknown>) {
    if (!props.task) return;
    const res = await fetch(`/api/tasks/${props.task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Update failed");
    router.refresh();
  }

  async function postComment() {
    if (!props.task || !commentBody.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/tasks/${props.task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      const data = (await res.json()) as CommentRow & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not post comment");
      setCommentBody("");
      setComments((c) => [
        {
          id: data.id,
          authorId: data.authorId,
          body: data.body,
          createdAt: data.createdAt,
        },
        ...c,
      ]);
      toast.success("Comment added");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post comment");
    } finally {
      setPosting(false);
    }
  }

  const t = props.task;

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden border-l border-border bg-card p-0 sm:max-w-lg">
        {!t ? null : (
          <>
            <SheetHeader className="border-b border-border/80 px-4 py-4">
              <SheetTitle className="pr-8 font-heading text-lg leading-snug">{t.title}</SheetTitle>
              <p className="text-xs text-muted-foreground">
                Timeline · Created {format(t.createdAt, "MMM d, yyyy")}
              </p>
            </SheetHeader>

            <ScrollArea className="flex-1 px-4 py-4">
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Priority</Label>
                    <Select
                      disabled={!props.canManage}
                      value={t.taskPriority ?? "__clear"}
                      onValueChange={(v) =>
                        void patch({ taskPriority: v === "__clear" ? null : v }).then(() =>
                          toast.success("Saved"),
                        )
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Set priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__clear">None</SelectItem>
                        {(Object.keys(PRIORITY_LABEL) as Array<keyof typeof PRIORITY_LABEL>).map((k) => (
                          <SelectItem key={k} value={k}>
                            {PRIORITY_LABEL[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Workflow status</Label>
                    <Select
                      disabled={!props.canManage}
                      value={t.workflowStatus ?? "not_started"}
                      onValueChange={(v) =>
                        void patch({
                          workflowStatus: v === "not_started" ? "not_started" : v,
                        }).then(() => toast.success("Saved"))
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(WORKFLOW_LABEL) as Array<keyof typeof WORKFLOW_LABEL>).map((k) => (
                          <SelectItem key={k} value={k}>
                            {WORKFLOW_LABEL[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Due date</Label>
                  <Input
                    type="datetime-local"
                    disabled={!props.canManage}
                    defaultValue={
                      t.dueAt
                        ? format(new Date(t.dueAt), "yyyy-MM-dd'T'HH:mm")
                        : ""
                    }
                    className="rounded-xl"
                    key={t.dueAt}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (!v) {
                        void patch({ dueAt: null }).then(() => toast.success("Saved"));
                        return;
                      }
                      const ms = new Date(v).getTime();
                      if (!Number.isFinite(ms)) return;
                      void patch({ dueAt: ms }).then(() => toast.success("Saved"));
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    disabled={!props.canManage}
                    defaultValue={t.description ?? ""}
                    key={t.description ?? "d"}
                    className="min-h-[72px] rounded-xl"
                    onBlur={(e) =>
                      void patch({ description: e.target.value || null }).then(() => toast.success("Saved"))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    disabled={!props.canManage}
                    defaultValue={t.notes ?? ""}
                    key={t.notes ?? "n"}
                    className="min-h-[72px] rounded-xl"
                    onBlur={(e) =>
                      void patch({ notes: e.target.value || null }).then(() => toast.success("Saved"))
                    }
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Owner</Label>
                    <Select
                      disabled={!props.canManage}
                      value={t.assigneeId ?? "__none"}
                      onValueChange={(v) =>
                        void patch({
                          assigneeId: v === "__none" ? null : v,
                        }).then(() => toast.success("Saved"))
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Unassigned</SelectItem>
                        {props.members.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Task type</Label>
                    <Select
                      disabled={!props.canManage}
                      value={t.taskType ?? "__none"}
                      onValueChange={(v) =>
                        void patch({
                          taskType: v === "__none" ? null : (v as TaskType),
                        }).then(() => toast.success("Saved"))
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        <SelectItem value="follow_up">Follow up</SelectItem>
                        <SelectItem value="call_investor">Call investor</SelectItem>
                        <SelectItem value="send_docs">Send docs</SelectItem>
                        <SelectItem value="review_commitment">Review commitment</SelectItem>
                        <SelectItem value="prepare_closing">Prepare closing</SelectItem>
                        <SelectItem value="update_room">Update room</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Related investor</Label>
                    <Select
                      disabled={!props.canManage}
                      value={t.linkedInvestorId ?? "__none"}
                      onValueChange={(v) =>
                        void patch({
                          linkedInvestorId: v === "__none" ? null : v,
                        }).then(() => toast.success("Saved"))
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {props.investors.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Related deal</Label>
                    <Select
                      disabled={!props.canManage}
                      value={t.linkedDealId ?? "__none"}
                      onValueChange={(v) =>
                        void patch({
                          linkedDealId: v === "__none" ? null : v,
                        }).then(() => toast.success("Saved"))
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {props.deals.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Related data room</Label>
                  <Select
                    disabled={!props.canManage}
                    value={t.linkedDataRoomId ?? "__none"}
                    onValueChange={(v) =>
                      void patch({
                        linkedDataRoomId: v === "__none" ? null : v,
                      }).then(() => toast.success("Saved"))
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {props.dataRooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Related records</h3>
                  <div className="flex flex-wrap gap-2">
                    {t.linkedInvestorId ? (
                      <Link
                        href={`/investors/${t.linkedInvestorId}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "rounded-lg",
                        )}
                      >
                        Open investor
                      </Link>
                    ) : null}
                    {t.linkedDealId ? (
                      <Link
                        href={`/deals/${t.linkedDealId}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "rounded-lg",
                        )}
                      >
                        Open deal
                      </Link>
                    ) : null}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Comments</h3>
                  {loadingComments ? (
                    <p className="text-xs text-muted-foreground">Loading comments…</p>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {comments.map((c) => (
                        <li key={c.id} className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                          <p className="font-medium text-foreground">
                            {props.memberLabels.get(c.authorId) ?? "Teammate"}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{c.body}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {format(c.createdAt, "MMM d, yyyy HH:mm")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {props.canManage ? (
                    <div className="space-y-2">
                      <Textarea
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        placeholder="Add a comment…"
                        className="min-h-[72px] rounded-xl"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-lg"
                        disabled={posting || !commentBody.trim()}
                        onClick={() => void postComment()}
                      >
                        {posting ? "Posting…" : "Post comment"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            </ScrollArea>

            <div className="mt-auto flex flex-wrap gap-2 border-t border-border/80 bg-muted/10 px-4 py-4">
              <Button
                type="button"
                className="rounded-xl"
                disabled={!props.canManage || t.status !== "open"}
                onClick={() =>
                  void patch({ status: "done" })
                    .then(() => {
                      toast.success("Marked complete");
                      props.onOpenChange(false);
                    })
                    .catch((e) => toast.error(e.message))
                }
              >
                Mark complete
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={!props.canManage}
                onClick={() =>
                  void patch({
                    dueAt: Date.now() + 7 * 86400000,
                  }).then(() => toast.success("Rescheduled (+7d)"))
                }
              >
                Reschedule +7d
              </Button>
              <Link
                href={t.linkedInvestorId ? `/investors/${t.linkedInvestorId}` : "/investors"}
                className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
              >
                Linked record
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
