import { paypalFetch } from "@/lib/paypal/client";

type PaypalVerifyRequest = {
  auth_algo: string;
  cert_url: string;
  transmission_id: string;
  transmission_sig: string;
  transmission_time: string;
  webhook_id: string;
  webhook_event: Record<string, unknown>;
};

export async function verifyPayPalWebhookSignature(body: PaypalVerifyRequest): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId || webhookId !== body.webhook_id) return false;

  const res = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      transmission_id: body.transmission_id,
      transmission_time: body.transmission_time,
      cert_url: body.cert_url,
      auth_algo: body.auth_algo,
      transmission_sig: body.transmission_sig,
      webhook_id: body.webhook_id,
      webhook_event: body.webhook_event,
    }),
  });
  if (!res.ok) return false;
  const json = (await res.json()) as { verification_status?: string };
  return json.verification_status === "SUCCESS";
}
