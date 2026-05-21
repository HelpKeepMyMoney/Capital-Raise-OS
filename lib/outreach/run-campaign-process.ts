import {
  logOutreachExecutionComplete,
  logOutreachExecutionSkipped,
  logOutreachExecutionStart,
  type OutreachProcessResult,
} from "@/lib/outreach/client-execution-log";

export async function runCampaignProcess(
  campaignId: string,
  campaignName: string,
): Promise<OutreachProcessResult | null> {
  logOutreachExecutionStart(campaignId, campaignName);

  const started = performance.now();
  const res = await fetch(`/api/outreach/campaigns/${campaignId}/process`, {
    method: "POST",
  });

  if (!res.ok) {
    let error = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) error = body.error;
    } catch {
      /* ignore */
    }
    logOutreachExecutionSkipped(error, { campaignId, campaignName });
    return null;
  }

  const json = (await res.json()) as OutreachProcessResult & { ok?: boolean };
  const result: OutreachProcessResult = {
    campaignId,
    campaignName,
    processed: json.processed ?? 0,
    emailsSent: json.emailsSent ?? 0,
    skippedNotDue: json.skippedNotDue ?? 0,
    reactivated: json.reactivated ?? 0,
    totalRecipients: json.totalRecipients ?? 0,
    errors: json.errors ?? [],
    blockedReason: json.blockedReason,
    durationMs: json.durationMs ?? Math.round(performance.now() - started),
    sequenceAttached: json.sequenceAttached ?? false,
    sequenceStepCount: json.sequenceStepCount ?? 0,
  };

  logOutreachExecutionComplete(result);
  return result;
}
