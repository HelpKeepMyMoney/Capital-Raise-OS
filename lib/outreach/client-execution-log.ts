/** Browser-console logging for outreach sequence runs (dev visibility). */

export const OUTREACH_LOG_PREFIX = "[CapitalOS Outreach]";

export type OutreachProcessResult = {
  campaignId: string;
  campaignName?: string;
  processed: number;
  emailsSent: number;
  skippedNotDue: number;
  reactivated: number;
  totalRecipients: number;
  errors: string[];
  blockedReason?: "NO_SEQUENCE" | "NO_ENABLED_STEPS" | "RESEND_NOT_CONFIGURED";
  durationMs: number;
  sequenceAttached: boolean;
  sequenceStepCount: number;
};

export function logOutreach(message: string, detail?: Record<string, unknown>): void {
  if (typeof console === "undefined") return;
  if (detail) console.log(`${OUTREACH_LOG_PREFIX} ${message}`, detail);
  else console.log(`${OUTREACH_LOG_PREFIX} ${message}`);
}

export function logOutreachExecutionStart(campaignId: string, campaignName: string): void {
  logOutreach("Campaign sequence execution started", {
    campaignId,
    campaignName,
    startedAt: new Date().toISOString(),
  });
}

export function logOutreachExecutionComplete(result: OutreachProcessResult): void {
  const seconds = (result.durationMs / 1000).toFixed(2);
  const parts = [
    `processed ${result.processed} recipient step(s)`,
    `${result.emailsSent} email(s) sent`,
    `${result.skippedNotDue} waiting for schedule`,
  ];
  if (result.reactivated > 0) parts.push(`${result.reactivated} reactivated`);
  if (result.blockedReason) parts.push(`blocked: ${result.blockedReason}`);
  if (result.errors.length > 0) parts.push(`${result.errors.length} error(s)`);
  logOutreach(`Campaign sequence execution finished in ${seconds}s — ${parts.join(", ")}`, result);
}

export function outreachProcessUserMessage(result: OutreachProcessResult): string | null {
  if (result.blockedReason === "RESEND_NOT_CONFIGURED") {
    return "Email sending is not configured (set RESEND_API_KEY on the server)";
  }
  if (result.blockedReason === "NO_SEQUENCE") {
    return "No email sequence attached — attach a sequence with at least one enabled step";
  }
  if (result.blockedReason === "NO_ENABLED_STEPS") {
    return "The sequence has no enabled steps — enable at least one email step";
  }
  if (result.errors.length > 0) return result.errors[0] ?? "Sequence run failed";
  if (result.emailsSent > 0) {
    return `Sent ${result.emailsSent} email(s) in ${(result.durationMs / 1000).toFixed(1)}s`;
  }
  if (result.reactivated > 0) {
    return `Reactivated ${result.reactivated} recipient(s) — click Run due emails again if needed`;
  }
  if (result.skippedNotDue > 0) {
    return `${result.skippedNotDue} recipient(s) scheduled for a later step`;
  }
  if (result.totalRecipients === 0) {
    return "No recipients enrolled — check audience and launch again";
  }
  if (result.processed > 0 && result.emailsSent === 0) {
    return "Checked recipients but no emails were sent — verify investor emails and enabled email steps";
  }
  if (result.processed === 0) {
    return "No due steps right now — check sequence delays or recipient schedule";
  }
  return null;
}

export function logOutreachExecutionSkipped(reason: string, detail?: Record<string, unknown>): void {
  logOutreach(`Campaign sequence not executed: ${reason}`, detail);
}
