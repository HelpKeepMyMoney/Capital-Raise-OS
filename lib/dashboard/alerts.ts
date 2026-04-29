import type { DashboardAlert } from "@/components/dashboard/alert-bar";
import type { Deal, DealCommitment, Investor, Meeting } from "@/lib/firestore/types";

export function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

export function buildDashboardAlerts(input: {
  commitments: DealCommitment[];
  investors: Investor[];
  deals: Deal[];
  overdueTaskCount: number;
  tasksDueTodayCount: number;
  startOfToday: number;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const now = Date.now();
  const fourteen = 14 * 86400000;

  const pendingDocs = input.commitments.filter(
    (c) => c.status === "active" && c.docStatus === "pending",
  );
  const pendingSum = pendingDocs.reduce((s, c) => s + c.amount, 0);
  if (pendingSum > 0) {
    alerts.push({
      id: "pending-docs",
      tone: "warning",
      message: `${fmtMoney(pendingSum)} in commitments pending subscription documents — follow up to close the loop.`,
      href: "/tasks",
    });
  }

  const dormant = input.investors.filter(
    (i) =>
      i.lastContactAt != null &&
      now - i.lastContactAt > fourteen &&
      !["closed", "declined", "committed"].includes(i.pipelineStage),
  );
  if (dormant.length > 0) {
    alerts.push({
      id: "dormant",
      tone: "gold",
      message: `${dormant.length} investor${dormant.length === 1 ? "" : "s"} inactive 14+ days — time for a warm touch.`,
      href: "/investors",
    });
  }

  const weekMs = 7 * 86400000;
  for (const d of input.deals) {
    if (d.closeDate == null) continue;
    if (d.status !== "active" && d.status !== "closing") continue;
    if (d.closeDate >= now && d.closeDate <= now + weekMs) {
      const days = Math.ceil((d.closeDate - now) / 86400000);
      alerts.push({
        id: `close-${d.id}`,
        tone: days <= 2 ? "urgent" : "info",
        message: `“${d.name}” closing window: ${days} day${days === 1 ? "" : "s"} remaining (${new Date(d.closeDate).toLocaleDateString()}).`,
        href: `/deals/${d.id}`,
      });
      break;
    }
  }

  if (input.overdueTaskCount > 0) {
    alerts.push({
      id: "tasks-overdue",
      tone: "urgent",
      message: `${input.overdueTaskCount} task${input.overdueTaskCount === 1 ? "" : "s"} overdue — clear the queue to protect momentum.`,
      href: "/tasks?due=overdue",
    });
  } else if (input.tasksDueTodayCount > 0) {
    alerts.push({
      id: "tasks-today",
      tone: "info",
      message: `${input.tasksDueTodayCount} task${input.tasksDueTodayCount === 1 ? "" : "s"} due today.`,
      href: "/tasks?due=today",
    });
  }

  return alerts.slice(0, 6);
}

export function meetingSoonAlert(meetings: Meeting[]): DashboardAlert | null {
  const next = meetings[0];
  if (!next?.startsAt) return null;
  const delta = next.startsAt - Date.now();
  const ms48 = 48 * 3600000;
  if (delta < 0 || delta > ms48) return null;
  const when = new Date(next.startsAt);
  return {
    id: `meeting-soon-${next.id}`,
    tone: "info",
    message: `Meeting coming up: ${next.title} — ${when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.`,
    href: "/tasks",
  };
}

/** Real reply-rate trend from last two ISO weeks (oldest vs newest bucket). Returns null if not comparable. */
export function outreachReplyRateTrend(
  weeks: { sent: number; replies: number }[],
): { direction: "up" | "down" | "flat"; pctPoints: number } | null {
  if (weeks.length < 2) return null;
  const a = weeks[weeks.length - 2]!;
  const b = weeks[weeks.length - 1]!;
  const ra = a.sent > 0 ? (a.replies / a.sent) * 100 : 0;
  const rb = b.sent > 0 ? (b.replies / b.sent) * 100 : 0;
  if (a.sent === 0 && b.sent === 0) return null;
  const diff = Math.round((rb - ra) * 10) / 10;
  if (Math.abs(diff) < 0.5) return { direction: "flat", pctPoints: diff };
  return { direction: diff > 0 ? "up" : "down", pctPoints: Math.abs(diff) };
}
