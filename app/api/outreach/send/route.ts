import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/auth/session";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = checkRateLimit(rateLimitKey(ip, "outreach-send"), 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = (await req.json()) as {
    to: string;
    subject: string;
    html: string;
    campaignId?: string;
    investorId?: string;
    replyTo?: string;
  };
  if (!body.to || !body.subject || !body.html) {
    return NextResponse.json({ error: "to, subject, html required" }, { status: 400 });
  }

  const from =
    process.env.RESEND_FROM ??
    process.env.OUTREACH_FROM_EMAIL ??
    "CPIN <onboarding@resend.dev>";

  const openToken = randomUUID();
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (req.headers.get("origin") ?? "http://localhost:3000");
  const pixel = `<img src="${base}/api/outreach/track/open?t=${encodeURIComponent(openToken)}" width="1" height="1" alt="" />`;
  const htmlFinal = `${body.html}${pixel}`;

  const db = getAdminFirestore();
  const id = randomUUID();
  await db.collection(col.emails).doc(id).set({
    id,
    organizationId: ctx.orgId,
    campaignId: body.campaignId ?? null,
    investorId: body.investorId ?? null,
    subject: body.subject,
    status: "queued",
    openCount: 0,
    clickCount: 0,
    replySentiment: "unknown",
    createdAt: Date.now(),
    openToken,
  });

  const data = await sendTransactionalEmail({
    from,
    to: body.to,
    subject: body.subject,
    html: htmlFinal,
    replyTo: body.replyTo,
  });

  await db.collection(col.emails).doc(id).update({
    resendMessageId: data?.id,
    status: "sent",
    sentAt: Date.now(),
  });

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "outreach.send",
    resource: `emails/${id}`,
  });

  return NextResponse.json({ ok: true, id, messageId: data?.id });
}
