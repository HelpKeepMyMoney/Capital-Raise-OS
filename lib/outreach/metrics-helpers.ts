import type { OutreachCampaign, OutreachCampaignMetrics } from "@/lib/firestore/types";

export function normalizeCampaignMetrics(
  campaign: Partial<OutreachCampaign>,
): OutreachCampaignMetrics {
  const m = campaign.metrics;
  const s = campaign.stats;
  return {
    recipients: m?.recipients ?? 0,
    sent: m?.sent ?? s?.sent ?? 0,
    opened: m?.opened ?? s?.opened ?? 0,
    replied: m?.replied ?? s?.replied ?? 0,
    clicked: m?.clicked ?? s?.clicked ?? 0,
    meetingsBooked: m?.meetingsBooked ?? 0,
    dataRoomVisits: m?.dataRoomVisits ?? 0,
    bounced: m?.bounced ?? s?.bounced ?? 0,
  };
}

export function metricsToLegacyStats(metrics: OutreachCampaignMetrics) {
  return {
    sent: metrics.sent,
    opened: metrics.opened,
    clicked: metrics.clicked,
    replied: metrics.replied,
    bounced: metrics.bounced ?? 0,
  };
}
