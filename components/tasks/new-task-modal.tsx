"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskType } from "@/lib/firestore/types";

type MemberOpt = { userId: string; label: string };
type RelOpt = { id: string; name: string };

const TEMPLATES: { label: string; title: string; taskType: TaskType }[] = [
  {
    label: "Investor follow up",
    title: "Follow up with investor — ",
    taskType: "follow_up",
  },
  { label: "Closing checklist", title: "Closing checklist — ", taskType: "prepare_closing" },
  { label: "Send docs", title: "Send subscription documents — ", taskType: "send_docs" },
  { label: "Prepare meeting", title: "Prepare diligence meeting — ", taskType: "call_investor" },
  { label: "Weekly LP update", title: "Weekly LP update — ", taskType: "update_room" },
];

export function NewTaskModal(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: MemberOpt[];
  investors: RelOpt[];
  deals: RelOpt[];
  dataRooms: RelOpt[];
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [due, setDue] = React.useState("");
  const [priority, setPriority] = React.useState<string>("medium");
  const [workflow, setWorkflow] = React.useState<string>("not_started");
  const [assignee, setAssignee] = React.useState<string>("__none");
  const [investor, setInvestor] = React.useState<string>("__none");
  const [deal, setDeal] = React.useState<string>("__none");
  const [room, setRoom] = React.useState<string>("__none");
  const [taskType, setTaskType] = React.useState<TaskType>("other");
  const [repeat, setRepeat] = React.useState("");
  const [reminder, setReminder] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setNotes("");
    setDue("");
    setPriority("medium");
    setWorkflow("not_started");
    setAssignee("__none");
    setInvestor("__none");
    setDeal("__none");
    setRoom("__none");
    setTaskType("other");
    setRepeat("");
    setReminder("");
  }

  async function create() {
    const t = title.trim();
    if (!t) {
      toast.error("Title is required");
      return;
    }
    let dueAt: number | undefined;
    if (due.trim()) {
      const d = new Date(due);
      const ms = d.getTime();
      if (!Number.isFinite(ms)) {
        toast.error("Invalid due date");
        return;
      }
      dueAt = ms;
    }

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        title: t,
        taskType,
        ...(dueAt != null ? { dueAt } : {}),
        taskPriority: priority,
        workflowStatus: workflow,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(assignee !== "__none" ? { assigneeId: assignee } : {}),
        ...(investor !== "__none" ? { linkedInvestorId: investor } : {}),
        ...(deal !== "__none" ? { linkedDealId: deal } : {}),
        ...(room !== "__none" ? { linkedDataRoomId: room } : {}),
        ...(repeat.trim() ? { repeatSchedule: repeat.trim() } : {}),
      };
      if (reminder.trim()) {
        const r = new Date(reminder);
        const ms = r.getTime();
        if (Number.isFinite(ms)) payload.reminderAt = ms;
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create task");
      toast.success("Task created");
      reset();
      props.onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create task");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={(v) => {
        if (!v) reset();
        props.onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading">New task</DialogTitle>
          <DialogDescription>
            Defaults: due in one week if you leave the due field empty. Optional links wire this task into CRM and deals.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((tm) => (
            <Button
              key={tm.label}
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full text-xs"
              onClick={() => {
                setTitle(tm.title);
                setTaskType(tm.taskType);
              }}
            >
              {tm.label}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="nt-title">Title</Label>
            <Input
              id="nt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
              placeholder="Follow up with lead investor"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nt-due">Due date &amp; time</Label>
              <Input
                id="nt-due"
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Reminder</Label>
              <Input
                type="datetime-local"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v ?? "medium")}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Workflow status</Label>
              <Select value={workflow} onValueChange={(v) => setWorkflow(v ?? "not_started")}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not started</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[64px] rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[64px] rounded-xl"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Owner</Label>
              <Select value={assignee} onValueChange={(v) => setAssignee(v ?? "__none")}>
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
              <Label>Task type</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              <Label>Related investor</Label>
              <Select value={investor} onValueChange={(v) => setInvestor(v ?? "__none")}>
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
              <Label>Related deal</Label>
              <Select value={deal} onValueChange={(v) => setDeal(v ?? "__none")}>
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
            <Label>Related data room</Label>
            <Select value={room} onValueChange={(v) => setRoom(v ?? "__none")}>
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
          <div className="space-y-2">
            <Label htmlFor="nt-repeat">Repeat schedule (hint)</Label>
            <Input
              id="nt-repeat"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              placeholder="e.g. weekly Monday 9am"
              className="rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 border-0 bg-transparent p-0 sm:justify-end">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className="rounded-xl" onClick={() => void create()} disabled={creating}>
            {creating ? "Creating…" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
