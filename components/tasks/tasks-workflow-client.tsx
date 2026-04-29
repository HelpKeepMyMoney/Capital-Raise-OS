"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Meeting, Task } from "@/lib/firestore/types";
import type { OrganizationMemberPublic } from "@/lib/firestore/queries";
import type { TaskMetricsPack } from "@/lib/tasks/metrics";
import type { SmartSuggestion } from "@/lib/tasks/smart-suggestions";
import { TasksHeader } from "@/components/tasks/tasks-header";
import { TaskMetrics } from "@/components/tasks/task-metrics";
import { TasksToolbar, type ViewMode, type WorkspaceSegment } from "@/components/tasks/tasks-toolbar";
import { TaskList } from "@/components/tasks/task-list";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskCalendar } from "@/components/tasks/task-calendar";
import { TaskOwnerBoard } from "@/components/tasks/task-owner-board";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { AutomationCenter } from "@/components/tasks/automation-center";
import { TaskInsights } from "@/components/tasks/task-insights";
import { SmartSuggestionsBar } from "@/components/tasks/smart-suggestions";

export function TasksWorkflowClient(props: {
  openTasks: Task[];
  closedTasks: Task[];
  members: OrganizationMemberPublic[];
  investorOptions: { id: string; name: string }[];
  dealOptions: { id: string; name: string }[];
  dataRoomOptions: { id: string; name: string }[];
  meetings: Meeting[];
  suggestions: SmartSuggestion[];
  metrics: TaskMetricsPack;
  metricsCapped: boolean;
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [segment, setSegment] = React.useState<WorkspaceSegment>("my");
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [search, setSearch] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState<
    NonNullable<Task["taskPriority"]> | "all"
  >("all");
  const [ownerFilter, setOwnerFilter] = React.useState<string | "all">("all");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const memberOptions = React.useMemo(
    () =>
      props.members.map((m) => ({
        userId: m.userId,
        label: m.displayName ?? m.email ?? m.userId,
      })),
    [props.members],
  );

  const memberLabels = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const m of props.members) {
      map.set(m.userId, m.displayName ?? m.email ?? m.userId);
    }
    return map;
  }, [props.members]);

  const investorNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const i of props.investorOptions) map.set(i.id, i.name);
    return map;
  }, [props.investorOptions]);

  const dealNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const d of props.dealOptions) map.set(d.id, d.name);
    return map;
  }, [props.dealOptions]);

  const baseList = segment === "completed" ? props.closedTasks : props.openTasks;

  const filtered = React.useMemo(() => {
    let list = baseList.slice();
    const q = search.trim().toLowerCase();
    if (segment === "my") {
      list = list.filter((t) => t.assigneeId === props.currentUserId);
    } else if (segment === "investor") {
      list = list.filter((t) => t.isInvestorFollowUp);
    } else if (segment === "closing") {
      list = list.filter(
        (t) =>
          t.taskType === "prepare_closing" ||
          t.taskType === "send_docs" ||
          t.taskType === "review_commitment",
      );
    }

    if (priorityFilter !== "all") {
      list = list.filter((t) => t.taskPriority === priorityFilter);
    }
    if (ownerFilter !== "all") {
      if (ownerFilter === "unassigned") list = list.filter((t) => !t.assigneeId);
      else list = list.filter((t) => t.assigneeId === ownerFilter);
    }
    if (q) {
      list = list.filter((t) => {
        const inv = t.linkedInvestorId ? investorNameById.get(t.linkedInvestorId) : "";
        const deal = t.linkedDealId ? dealNameById.get(t.linkedDealId) : "";
        return (
          t.title.toLowerCase().includes(q) ||
          (inv ?? "").toLowerCase().includes(q) ||
          (deal ?? "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [
    baseList,
    segment,
    search,
    priorityFilter,
    ownerFilter,
    investorNameById,
    dealNameById,
    props.currentUserId,
  ]);

  function openTask(t: Task) {
    setActiveTask(t);
    setDrawerOpen(true);
  }

  async function patchTask(id: string, body: Record<string, unknown>) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      toast.success("Updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPendingId(null);
    }
  }

  function resolveRelated(task: Task) {
    if (task.linkedInvestorId) {
      return {
        label: investorNameById.get(task.linkedInvestorId) ?? "Investor",
        href: `/investors/${task.linkedInvestorId}`,
      };
    }
    if (task.linkedDealId) {
      return {
        label: dealNameById.get(task.linkedDealId) ?? "Deal",
        href: `/deals/${task.linkedDealId}`,
      };
    }
    return {};
  }

  function resolveOwner(task: Task) {
    if (!task.assigneeId) return "—";
    return memberLabels.get(task.assigneeId) ?? task.assigneeId.slice(0, 6) + "…";
  }

  function resolveCreator(task: Task) {
    if (!task.createdByUserId) return "—";
    return memberLabels.get(task.createdByUserId) ?? "System";
  }

  const automationRef = React.useCallback(() => {
    document.getElementById("task-automation-center")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
      <div className="min-h-screen bg-muted/40">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="mx-auto max-w-[1400px] space-y-8 px-4 py-8 md:px-6 lg:px-8"
      >
        <TasksHeader
          canManage={props.canManage}
          onNewTask={() => setNewOpen(true)}
          onBulkActions={() => toast.info("Bulk actions — multi-select coming in a future update")}
          onScrollAutomations={automationRef}
        />

        <TaskMetrics metrics={props.metrics} metricsCapped={props.metricsCapped} />

        <SmartSuggestionsBar suggestions={props.suggestions} />

        <TasksToolbar
          segment={segment}
          onSegmentChange={setSegment}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          search={search}
          onSearchChange={setSearch}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          ownerFilter={ownerFilter}
          onOwnerFilterChange={setOwnerFilter}
          memberOptions={memberOptions}
          onScrollAutomations={automationRef}
        />

        <div className="space-y-6">
          {viewMode === "list" ? (
            <TaskList
              tasks={filtered}
              resolveRelated={resolveRelated}
              resolveOwner={resolveOwner}
              resolveCreator={resolveCreator}
              isCompletedView={segment === "completed"}
              pendingId={pendingId}
              canManage={props.canManage}
              onToggleComplete={(id) => void patchTask(id, { status: "done" })}
              onToggleReopen={(id) => void patchTask(id, { status: "open" })}
              onOpenTask={openTask}
              onSnooze={(t) =>
                void patchTask(t.id, { snoozedUntil: Date.now() + 7 * 86400000 })
              }
              onReassign={openTask}
              onDelete={(t) => void patchTask(t.id, { status: "cancelled" })}
            />
          ) : null}
          {viewMode === "kanban" && segment !== "completed" ? <TaskBoard tasks={filtered} /> : null}
          {viewMode === "calendar" ? (
            <TaskCalendar tasks={props.openTasks} meetings={props.meetings} />
          ) : null}
          {viewMode === "owner" && segment !== "completed" ? (
            <TaskOwnerBoard tasks={filtered} memberLabels={memberLabels} />
          ) : null}
        </div>

        <TaskInsights
          tasks={[...props.openTasks, ...props.closedTasks]}
          memberLabels={memberLabels}
          disclaimer={props.metricsCapped}
        />

        <AutomationCenter />

        <TaskDrawer
          task={activeTask}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          members={memberOptions}
          investors={props.investorOptions}
          deals={props.dealOptions}
          dataRooms={props.dataRoomOptions}
          memberLabels={memberLabels}
          canManage={props.canManage}
        />

        <NewTaskModal
          open={newOpen}
          onOpenChange={setNewOpen}
          members={memberOptions}
          investors={props.investorOptions}
          deals={props.dealOptions}
          dataRooms={props.dataRoomOptions}
        />
      </motion.div>
    </div>
  );
}
