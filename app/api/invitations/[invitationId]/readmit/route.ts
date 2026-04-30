import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
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
import { listDataRoomIdsForDeals } from "@/lib/invitations/data-rooms";
import { generateInviteToken, hashInviteToken } from "@/lib/invitations/token";

const DEFAULT_INVITE_DAYS = 14;

function appBaseUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    req.headers.get("origin") ??
    "http://localhost:3000"
  );
}

/**
 * Reopens a revoked invitation: clears revoke + prior acceptance, rotates token & expiry,
 * refreshes deal-linked data room IDs. Investor must accept again to restore membership/access.
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

  let sendEmail = false;
  try {
    const raw = await req.json();
    if (raw && typeof raw === "object" && raw !== null && "sendEmail" in raw) {
      sendEmail = Boolean((raw as { sendEmail?: unknown }).sendEmail);
    }
  } catch {
    /* empty body OK */
  }

  const db = getAdminFirestore();
  const invRef = db.collection(col.investorInvitations).doc(id);
  const snap = await invRef.get();
  if (!snap.exists) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  const inv = { id: snap.id, ...(snap.data() as Omit<InvestorInvitation, "id">) };
  if (inv.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!inv.revokedAt) {
    return NextResponse.json(
      { error: "This invitation is not revoked — use Resend invitation instead." },
      { status: 400 },
    );
  }

  const dataRoomIds: string[] =
    inv.scope === "deal" ? await listDataRoomIdsForDeals(ctx.orgId, inv.dealIds ?? []) : [];

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const now = Date.now();
  const expiresAt = now + DEFAULT_INVITE_DAYS * 86400000;

  await invRef.set(
    {
      tokenHash,
      expiresAt,
      dataRoomIds,
      revokedAt: FieldValue.delete(),
      acceptedAt: FieldValue.delete(),
      acceptedUserId: FieldValue.delete(),
    },
    { merge: true },
  );

  const base = appBaseUrl(req);
  const inviteUrl = `${base}/invite/${encodeURIComponent(rawToken)}`;
  let emailSent: boolean | null = null;

  const email =
    typeof inv.email === "string" && inv.email.trim()
      ? inv.email.trim().toLowerCase()
      : undefined;

  if (sendEmail) {
    if (!email) {
      await writeAuditLog({
        organizationId: ctx.orgId,
        actorId: ctx.user.uid,
        action: "invite.readmit",
        resource: `${col.investorInvitations}/${id}`,
        payload: { email: null, emailSent: false, note: "no_email_on_record" },
      });
      return NextResponse.json({
        ok: true,
        inviteUrl,
        inviteToken: rawToken,
        warning: "No email on this invitation — share the link manually.",
      });
    }
    if (!process.env.RESEND_API_KEY) {
      await writeAuditLog({
        organizationId: ctx.orgId,
        actorId: ctx.user.uid,
        action: "invite.readmit",
        resource: `${col.investorInvitations}/${id}`,
        payload: { email, emailSent: false, note: "resend_missing" },
      });
      return NextResponse.json({
        ok: true,
        inviteUrl,
        inviteToken: rawToken,
        warning: "RESEND_API_KEY is not set — share the link manually.",
      });
    }

    try {
      const org = await db.collection(col.organizations).doc(ctx.orgId).get();
      const orgName = (org.data()?.name as string | undefined) ?? "Your organization";
      const scopeLabel = inv.scope === "deal" ? "a deal" : "the investor portal";
      const subject = `Invitation to view ${scopeLabel} — ${orgName}`;
      const html = `
        <p>You’ve been invited (again) to the ${escapeHtmlForEmail(orgName)} workspace on CPIN Capital Management System.</p>
        <p><a href="${inviteUrl}">Accept invitation</a></p>
        <p style="color:#666;font-size:12px">This link expires in ${DEFAULT_INVITE_DAYS} days.</p>
      `.trim();
      await sendTransactionalEmail({
        from: invitationsTransactionalFrom(),
        to: email,
        subject,
        html,
      });
      emailSent = true;
    } catch (e) {
      console.error("[readmit] email", e);
      await writeAuditLog({
        organizationId: ctx.orgId,
        actorId: ctx.user.uid,
        action: "invite.readmit",
        resource: `${col.investorInvitations}/${id}`,
        payload: { email, emailSent: false, note: "email_error" },
      });
      return NextResponse.json(
        {
          ok: true,
          inviteUrl,
          inviteToken: rawToken,
          warning: e instanceof Error ? e.message : "Email failed — share the link manually.",
        },
        { status: 502 },
      );
    }
  }

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "invite.readmit",
    resource: `${col.investorInvitations}/${id}`,
    payload: { email: email ?? null, emailSent: emailSent ?? false },
  });

  return NextResponse.json({
    ok: true,
    inviteUrl,
    inviteToken: rawToken,
    ...(emailSent !== null ? { emailSent } : {}),
  });
}
