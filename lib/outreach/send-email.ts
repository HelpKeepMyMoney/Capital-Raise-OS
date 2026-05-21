import { randomUUID } from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { col } from "@/lib/firestore/paths";
import type {
  Organization,
  OutreachDomainSettings,
  OutreachTouch,
} from "@/lib/firestore/types";
import { recordOutreachEvent } from "@/lib/outreach/events";
import { mintOutreachTrackingToken } from "@/lib/outreach/tracking-tokens";
import { htmlToPlainText } from "@/lib/outreach/template-vars";

export type SendOutreachEmailInput = {
  db: Firestore;
  organizationId: string;
  organization: Organization;
  domainSettings?: OutreachDomainSettings | null;
  to: string;
  subject: string;
  html: string;
  text?: string;
  campaignId?: string;
  investorId?: string;
  recipientId?: string;
  stepIndex?: number;
  sequenceStepId?: string;
  replyTo?: string;
  baseUrl: string;
};

function wrapBrandedHtml(inner: string, org: Organization): string {
  const fromName = org.settings?.emailFromName ?? org.name;
  return `<!DOCTYPE html><html><body style="font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;line-height:1.6;max-width:640px;margin:0 auto;padding:24px;">
<div style="border-bottom:1px solid #e5e5e5;padding-bottom:12px;margin-bottom:24px;">
<strong style="font-size:14px;letter-spacing:0.02em;">${fromName}</strong>
</div>
${inner}
<p style="margin-top:32px;font-size:11px;color:#737373;">Confidential — for the intended recipient only.</p>
</body></html>`;
}

function rewriteLinksForTracking(html: string, touchId: string, baseUrl: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/gi, (match, url: string) => {
    if (url.includes("/api/outreach/track/")) return match;
    const token = mintOutreachTrackingToken({
      touchId,
      exp: Date.now() + 90 * 86400000,
      url,
    });
    const tracked = `${baseUrl}/api/outreach/track/click?t=${encodeURIComponent(token)}`;
    return `href="${tracked}"`;
  });
}

export async function sendOutreachEmail(
  input: SendOutreachEmailInput,
): Promise<{ touchId: string; legacyEmailId: string; messageId?: string }> {
  const touchId = randomUUID();
  const legacyEmailId = randomUUID();
  const trackingToken = mintOutreachTrackingToken({
    touchId,
    exp: Date.now() + 90 * 86400000,
  });

  const fromEmail =
    input.domainSettings?.fromEmail ??
    process.env.RESEND_FROM ??
    process.env.OUTREACH_FROM_EMAIL ??
    "CPIN <onboarding@resend.dev>";
  const fromName =
    input.domainSettings?.fromName ?? input.organization.settings?.emailFromName ?? input.organization.name;
  const from = fromEmail.includes("<") ? fromEmail : `${fromName} <${fromEmail}>`;

  let bodyHtml = input.html;
  if (input.campaignId && input.recipientId) {
    bodyHtml = rewriteLinksForTracking(bodyHtml, touchId, input.baseUrl);
  }
  const pixel = `<img src="${input.baseUrl}/api/outreach/track/open?t=${encodeURIComponent(trackingToken)}" width="1" height="1" alt="" />`;
  const wrapped = wrapBrandedHtml(bodyHtml, input.organization);
  const htmlFinal = `${wrapped}${pixel}`;

  const unsubscribeToken =
    input.recipientId &&
    mintOutreachTrackingToken({
      touchId: `unsub:${input.recipientId}`,
      exp: Date.now() + 365 * 86400000,
    });
  const footerUnsub = unsubscribeToken
    ? `<p style="font-size:11px;color:#737373;margin-top:16px;"><a href="${input.baseUrl}/api/outreach/unsubscribe?t=${encodeURIComponent(unsubscribeToken)}">Unsubscribe</a></p>`
    : "";

  const plain = input.text ?? htmlToPlainText(input.html);

  const now = Date.now();
  const touch: OutreachTouch = {
    id: touchId,
    organizationId: input.organizationId,
    campaignId: input.campaignId ?? "",
    recipientId: input.recipientId ?? "",
    investorId: input.investorId ?? "",
    sequenceStepId: input.sequenceStepId,
    stepIndex: input.stepIndex ?? 0,
    subject: input.subject,
    bodyHtml: input.html,
    status: "queued",
    trackingToken,
    openCount: 0,
    clickCount: 0,
    createdAt: now,
    legacyEmailId,
  };

  await input.db.collection(col.outreachTouches).doc(touchId).set({
    ...touch,
    campaignId: input.campaignId ?? null,
    recipientId: input.recipientId ?? null,
    investorId: input.investorId ?? null,
  });

  await input.db.collection(col.emails).doc(legacyEmailId).set({
    id: legacyEmailId,
    organizationId: input.organizationId,
    campaignId: input.campaignId ?? null,
    investorId: input.investorId ?? null,
    recipientId: input.recipientId ?? null,
    touchId,
    subject: input.subject,
    status: "queued",
    openCount: 0,
    clickCount: 0,
    replySentiment: "unknown",
    createdAt: now,
    openToken: trackingToken,
  });

  const data = await sendTransactionalEmail({
    from,
    to: input.to,
    subject: input.subject,
    html: htmlFinal + footerUnsub,
    replyTo: input.replyTo ?? input.domainSettings?.replyToEmail,
    headers: input.recipientId ? { "List-Unsubscribe": `<${input.baseUrl}/api/outreach/unsubscribe>` } : undefined,
  });

  await input.db.collection(col.outreachTouches).doc(touchId).update({
    status: "sent",
    resendMessageId: data?.id ?? null,
    sentAt: now,
  });
  await input.db.collection(col.emails).doc(legacyEmailId).update({
    resendMessageId: data?.id ?? null,
    status: "sent",
    sentAt: now,
  });

  if (input.campaignId && input.recipientId && input.investorId) {
    await recordOutreachEvent(input.db, {
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      recipientId: input.recipientId,
      investorId: input.investorId,
      eventType: "email_sent",
      touchId,
      metadata: { subject: input.subject },
    });
  }

  return { touchId, legacyEmailId, messageId: data?.id };
}
