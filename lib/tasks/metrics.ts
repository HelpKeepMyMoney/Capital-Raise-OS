import { endOfDay, startOfDay, startOfWeek, subDays } from "date-fns";
import type { Task } from "@/lib/firestore/types";

export type TaskMetricsPack = {
  openCount: number;
  dueTodayCount: number;
  overdueCount: number;
  completedThisWeekCount: number;
  investorFollowUpCount: number;
  dealClosingCount: number;
  completedPrevWeekCount: number;
};

export function computeTaskMetrics(open: Task[], closed: Task[], now = Date.now()): TaskMetricsPack {
  const startToday = startOfDay(now).getTime();
  const endToday = endOfDay(now).getTime();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
  const prevWeekStart = subDays(startOfWeek(now, { weekStartsOn: 1 }), 7).getTime();

  const openTasks = open.filter((t) => t.status === "open");

  let overdueCount = 0;
  let dueTodayCount = 0;
  for (const t of openTasks) {
    if (t.dueAt == null) continue;
    if (t.dueAt < startToday) overdueCount += 1;
    else if (t.dueAt >= startToday && t.dueAt <= endToday) dueTodayCount += 1;
  }

  let completedThisWeekCount = 0;
  let completedPrevWeekCount = 0;
  for (const t of closed) {
    if (t.status !== "done") continue;
    const ts = t.completedAt ?? t.updatedAt ?? t.createdAt;
    if (ts >= weekStart) completedThisWeekCount += 1;
    else if (ts >= prevWeekStart && ts < weekStart) completedPrevWeekCount += 1;
  }

  const investorFollowUpCount = openTasks.filter((t) => t.isInvestorFollowUp).length;
  const dealClosingCount = openTasks.filter(
    (t) =>
      t.taskType === "prepare_closing" ||
      t.taskType === "send_docs" ||
      t.taskType === "review_commitment",
  ).length;

  return {
    openCount: openTasks.length,
    dueTodayCount,
    overdueCount,
    completedThisWeekCount,
    investorFollowUpCount,
    dealClosingCount,
    completedPrevWeekCount,
  };
}
