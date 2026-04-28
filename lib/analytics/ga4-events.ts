export const GA4_EVENTS = {
  signup_started: "signup_started",
  signup_completed: "signup_completed",
  trial_started: "trial_started",
  subscription_started: "subscription_started",
  subscription_cancelled: "subscription_cancelled",
  investor_created: "investor_created",
  campaign_sent: "campaign_sent",
  meeting_booked: "meeting_booked",
  deal_created: "deal_created",
  document_viewed: "document_viewed",
  commitment_added: "commitment_added",
  capital_closed: "capital_closed",
} as const;

export type Ga4EventName = (typeof GA4_EVENTS)[keyof typeof GA4_EVENTS];

export type Ga4Payload = {
  event: Ga4EventName;
  params?: Record<string, string | number | boolean | undefined>;
};

export function ga4EventPayload(
  event: Ga4EventName,
  params?: Record<string, string | number | boolean | undefined>,
): Ga4Payload {
  return { event, params };
}
