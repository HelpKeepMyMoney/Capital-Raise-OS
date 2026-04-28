/**
 * Server-side GA4 events via Measurement Protocol (optional).
 * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */
export async function sendGa4Mp(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  const mid = process.env.GA4_MEASUREMENT_ID;
  const secret = process.env.GA4_API_SECRET;
  if (!mid || !secret) return;

  await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(mid)}&api_secret=${encodeURIComponent(secret)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: "server",
        events: [{ name: eventName, params: params ?? {} }],
      }),
    },
  );
}
