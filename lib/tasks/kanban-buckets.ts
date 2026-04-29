import { endOfDay, endOfWeek, startOfDay } from "date-fns";
import type { Task } from "@/lib/firestore/types";

export type KanbanColumnId = "today" | "week" | "waiting" | "blocked" | "done";

export function kanbanColumnForTask(task: Task, now = Date.now()): KanbanColumnId {
  if (task.status !== "open") return "done";
  if (task.workflowStatus === "blocked") return "blocked";
  if (task.workflowStatus === "waiting") return "waiting";

  const startToday = startOfDay(now).getTime();
  const endWeek = endOfWeek(now, { weekStartsOn: 1 }).getTime();

  if (task.dueAt != null) {
    if (task.dueAt < startToday) return "today";
    const endToday = endOfDay(now).getTime();
    if (task.dueAt <= endToday) return "today";
    if (task.dueAt <= endWeek) return "week";
  }

  return "week";
}

export function patchPayloadForKanbanColumn(
  columnId: KanbanColumnId,
  now = Date.now(),
): Record<string, unknown> {
  const endToday = endOfDay(now).getTime();
  const endWeek = endOfWeek(now, { weekStartsOn: 1 }).getTime();

  switch (columnId) {
    case "done":
      return { status: "done" };
    case "blocked":
      return { status: "open", workflowStatus: "blocked" };
    case "waiting":
      return { status: "open", workflowStatus: "waiting" };
    case "today":
      return { status: "open", workflowStatus: "in_progress", dueAt: endToday };
    case "week":
    default:
      return {
        status: "open",
        workflowStatus: "not_started",
        dueAt: endWeek,
      };
  }
}
