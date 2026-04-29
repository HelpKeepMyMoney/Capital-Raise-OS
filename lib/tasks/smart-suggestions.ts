import type { Investor, Meeting, Task } from "@/lib/firestore/types";

export type SmartSuggestion = {
  id: string;
  title: string;
  detail: string;
  tone: "warning" | "info" | "success";
};

const DAY = 86400000;

function investorName(inv: Investor): string {
  return inv.name?.trim() || [inv.firstName, inv.lastName].filter(Boolean).join(" ") || "Investor";
}

/** Lightweight heuristics for “smart suggestions” cards (best-effort from loaded data). */
export function buildSmartSuggestions(input: {
  tasks: Task[];
  investors: Investor[];
  meetings: Meeting[];
  now?: number;
}): SmartSuggestion[] {
  const now = input.now ?? Date.now();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const suggestions: SmartSuggestion[] = [];

  const investorById = new Map(input.investors.map((i) => [i.id, i]));

  for (const t of input.tasks) {
    if (t.status !== "open") continue;
    if (!t.linkedInvestorId) continue;
    const inv = investorById.get(t.linkedInvestorId);
    if (!inv) continue;
    const last = inv.lastContactAt;
    if (last != null && now - last > 12 * DAY && t.isInvestorFollowUp) {
      suggestions.push({
        id: `stale-${t.id}`,
        title: `Reconnect with ${investorName(inv)}`,
        detail: "No logged contact in over 12 days while a CRM follow-up task is open.",
        tone: "warning",
      });
      break;
    }
  }

  const tomorrow = startOfToday.getTime() + 2 * DAY;
  for (const m of input.meetings) {
    if (m.startsAt >= now && m.startsAt <= tomorrow && m.status === "scheduled") {
      suggestions.push({
        id: `meet-${m.id}`,
        title: `Meeting: ${m.title}`,
        detail: "Starts soon — prep notes and deck from Tasks.",
        tone: "info",
      });
      break;
    }
  }

  const overdueOpen = input.tasks.filter(
    (t) => t.status === "open" && t.dueAt != null && t.dueAt < startOfToday.getTime(),
  ).length;
  if (overdueOpen >= 3) {
    suggestions.push({
      id: "bulk-overdue",
      title: `${overdueOpen} tasks look overdue`,
      detail: "Review priorities and reschedule or close completed work.",
      tone: "warning",
    });
  }

  if (suggestions.length < 3) {
    for (const inv of input.investors) {
      if (inv.pipelineStage === "soft_circled" && suggestions.length < 5) {
        suggestions.push({
          id: `soft-${inv.id}`,
          title: `${investorName(inv)} — soft circle`,
          detail: "Advance subscription docs or clarify timeline while interest is warm.",
          tone: "info",
        });
        break;
      }
    }
  }

  return suggestions.slice(0, 6);
}
