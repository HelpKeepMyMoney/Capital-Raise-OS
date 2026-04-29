import type { TaskPriority, TaskWorkflowStatus } from "@/lib/firestore/types";

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const WORKFLOW_LABEL: Record<TaskWorkflowStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  waiting: "Waiting",
  blocked: "Blocked",
};

export function priorityBadgeClass(p?: TaskPriority): string {
  switch (p) {
    case "urgent":
      return "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300";
    case "high":
      return "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200";
    case "medium":
      return "border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200";
    case "low":
    default:
      return "border-muted-foreground/30 bg-muted text-muted-foreground";
  }
}
