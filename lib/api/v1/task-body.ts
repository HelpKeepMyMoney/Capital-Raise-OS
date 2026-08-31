import type { TaskPriority, TaskType, TaskWorkflowStatus } from "@/lib/firestore/types";

const WORKFLOW: TaskWorkflowStatus[] = ["not_started", "in_progress", "waiting", "blocked"];

export function isTaskPriority(v: unknown): v is TaskPriority {
  return v === "low" || v === "medium" || v === "high" || v === "urgent";
}

export function isTaskType(v: unknown): v is TaskType {
  return (
    v === "follow_up" ||
    v === "call_investor" ||
    v === "send_docs" ||
    v === "review_commitment" ||
    v === "prepare_closing" ||
    v === "update_room" ||
    v === "other"
  );
}

export function isWorkflow(v: unknown): v is TaskWorkflowStatus {
  return typeof v === "string" && WORKFLOW.includes(v as TaskWorkflowStatus);
}

export function isTaskStatus(v: unknown): v is "open" | "done" | "cancelled" {
  return v === "open" || v === "done" || v === "cancelled";
}
