import { NextRequest, NextResponse } from "next/server";
import { verifyPayPalWebhookSignature } from "@/lib/paypal/verify-webhook";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { createHash, randomUUID } from "crypto";
import { sendGa4Mp } from "@/lib/analytics/measurement-protocol";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    auth_algo?: string;
    cert_url?: string;
    transmission_id?: string;
    transmission_sig?: string;
    transmission_time?: string;
    webhook_id?: string;
    webhook_event?: Record<string, unknown>;
  };

  if (
    !body.auth_algo ||
    !body.cert_url ||
    !body.transmission_id ||
    !body.transmission_sig ||
    !body.transmission_time ||
    !body.webhook_id ||
    !body.webhook_event
  ) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const ok = await verifyPayPalWebhookSignature({
    auth_algo: body.auth_algo,
    cert_url: body.cert_url,
    transmission_id: body.transmission_id,
    transmission_sig: body.transmission_sig,
    transmission_time: body.transmission_time,
    webhook_id: body.webhook_id,
    webhook_event: body.webhook_event,
  });
  if (!ok) return NextResponse.json({ error: "verify failed" }, { status: 400 });

  const db = getAdminFirestore();
  const raw = JSON.stringify(body);
  const hash = createHash("sha256").update(raw).digest("hex");
  const deliveryId = `${body.transmission_id}-${hash.slice(0, 12)}`;
  const dup = await db.collection(col.webhooks).doc(deliveryId).get();
  if (dup.exists) {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  await db.collection(col.webhooks).doc(deliveryId).set({
    id: deliveryId,
    provider: "paypal",
    processedAt: Date.now(),
    payload: body.webhook_event,
  });

  const ev = body.webhook_event as {
    event_type?: string;
    resource?: { id?: string; status?: string; custom_id?: string; subscriber?: { email_address?: string } };
  };
  const type = ev.event_type ?? "";
  const orgId = ev.resource?.custom_id;

  if (orgId && (type.includes("SUBSCRIPTION") || type.includes("PAYMENT"))) {
    const subId = ev.resource?.id;
    const status =
      type.includes("CANCELLED") || type.includes("CANCEL")
        ? "cancelled"
        : type.includes("SUSPENDED")
          ? "past_due"
          : "active";
    await db.collection(col.subscriptions).doc(orgId).set(
      {
        id: orgId,
        organizationId: orgId,
        paypalSubscriptionId: subId,
        status,
        lastWebhookAt: Date.now(),
      },
      { merge: true },
    );
    await db.collection(col.organizations).doc(orgId).set(
      {
        subscription: {
          plan: "starter",
          status,
          paypalSubscriptionId: subId,
        },
      },
      { merge: true },
    );
    if (type.includes("ACTIVATED") || type.includes("ACTIVE")) {
      void sendGa4Mp("subscription_started", { org_id: orgId });
    }
    if (type.includes("CANCELLED") || type.includes("CANCEL")) {
      void sendGa4Mp("subscription_cancelled", { org_id: orgId });
    }
  }

  return NextResponse.json({ ok: true, id: randomUUID() });
}
