import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership, getOrganization } from "@/lib/firestore/queries";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { SendEmailSchema } from "@/lib/outreach/schemas";
import { sendOutreachEmail } from "@/lib/outreach/send-email";
import { assertOutreachSendAllowed } from "@/lib/outreach/entitlements";
import type { OutreachDomainSettings } from "@/lib/firestore/types";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = checkRateLimit(rateLimitKey(ip, "outreach-send"), 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SendEmailSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getAdminFirestore();
  const allowed = await assertOutreachSendAllowed(db, ctx.orgId);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.message }, { status: 402 });
  }

  const org = await getOrganization(ctx.orgId);
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const domainSnap = await db.collection(col.outreachDomainSettings).doc(ctx.orgId).get();
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (req.headers.get("origin") ?? "http://localhost:3000");

  const { touchId, legacyEmailId, messageId } = await sendOutreachEmail({
    db,
    organizationId: ctx.orgId,
    organization: org,
    domainSettings: domainSnap.exists
      ? ({ organizationId: ctx.orgId, ...domainSnap.data() } as OutreachDomainSettings)
      : null,
    to: parsed.data.to,
    subject: parsed.data.subject,
    html: parsed.data.html,
    text: parsed.data.text,
    campaignId: parsed.data.campaignId,
    investorId: parsed.data.investorId,
    recipientId: parsed.data.recipientId,
    replyTo: parsed.data.replyTo,
    baseUrl: base,
  });

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "outreach.send",
    resource: `${col.outreachTouches}/${touchId}`,
  });

  return NextResponse.json({ ok: true, id: legacyEmailId, touchId, messageId });
}
