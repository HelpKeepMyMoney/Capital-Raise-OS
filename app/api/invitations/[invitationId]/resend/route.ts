import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { InvestorInvitation } from "@/lib/firestore/types";
import { getMembership } from "@/lib/firestore/queries";
import {
  escapeHtmlForEmail,
  invitationsTransactionalFrom,
} from "@/lib/invitations/invite-email-shared";
import { generateInviteToken, hashInviteToken } from "@/lib/invitations/token";

function appBaseUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    req.headers.get("origin") ??
    "http://localhost:3000"
  );
}

const DEFAULT_INVITE_DAYS = 14;

/**
 * Pending / expired: rotate token + extend expiry, then email fresh invite link.
 * Accepted: send a portal reminder (no token change).
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ invitationId: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { invitationId } = await context.params;
  const id = typeof invitationId === "string" ? invitationId.trim() : "";
  if (!id) return NextResponse.json({ error: "Invalid invitation id" }, { status: 400 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 503 });
  }

  const db = getAdminFirestore();
  const ref = db.collection(col.investorInvitations).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  const inv = { id: snap.id, ...(snap.data() as Omit<InvestorInvitation, "id">) };
  if (inv.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (inv.revokedAt) {
    return NextResponse.json({ error: "Invitation was revoked." }, { status: 410 });
  }

  const email = typeof inv.email === "string" ? inv.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json(
      { error: "This invitation has no email — copy the invite link from the invite dialog instead." },
      { status: 400 },
    );
  }

  const org = await db.collection(col.organizations).doc(ctx.orgId).get();
  const orgName = (org.data()?.name as string | undefined) ?? "Your organization";
  const base = appBaseUrl(req);
  const from = invitationsTransactionalFrom();
  const now = Date.now();

  if (inv.acceptedAt && inv.acceptedUserId) {
    const loginUrl = `${base}/login`;
    const dealUrl =
      inv.scope === "deal" && inv.dealIds[0] ? `${base}/deals/${encodeURIComponent(inv.dealIds[0])}` : null;
    const subject = `Reminder — ${orgName} investor portal`;
    const html = `
      <p>Hi,</p>
      <p>This is a quick reminder from ${escapeHtmlForEmail(orgName)}. You already accepted your invitation — sign in to pick up where you left off.</p>
      <p><a href="${loginUrl}">Sign in to CapitalOS</a></p>
      ${
        dealUrl
          ? `<p><a href="${dealUrl}">Open your deal workspace</a></p>`
          : `<p><a href="${base}/portal">Open your investor portal</a></p>`
      }
    `.trim();

    await sendTransactionalEmail({ from, to: email, subject, html });

    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.user.uid,
      action: "invite.remind",
      resource: `${col.investorInvitations}/${id}`,
      payload: { email, mode: "accepted_reminder" },
    });

    return NextResponse.json({ ok: true, mode: "reminder" as const });
  }

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const inviteUrl = `${base}/invite/${encodeURIComponent(rawToken)}`;
  const expiresAt = now + DEFAULT_INVITE_DAYS * 86400000;

  await ref.set(
    {
      tokenHash,
      expiresAt,
    },
    { merge: true },
  );

  const scopeLabel = inv.scope === "deal" ? "a deal" : "the investor portal";
  const subject = `Invitation to view ${scopeLabel} — ${orgName}`;
  const html = `
    <p>You’ve been invited to the ${escapeHtmlForEmail(orgName)} workspace on CPIN Capital Management System.</p>
    <p><a href="${inviteUrl}">Accept invitation</a></p>
    <p style="color:#666;font-size:12px">This link expires in ${DEFAULT_INVITE_DAYS} days.</p>
  `.trim();

  await sendTransactionalEmail({ from, to: email, subject, html });

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "invite.resend",
    resource: `${col.investorInvitations}/${id}`,
    payload: { email, mode: "fresh_link" },
  });

  return NextResponse.json({ ok: true, mode: "fresh_link" as const, inviteUrl });
}
