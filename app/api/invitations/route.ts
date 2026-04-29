import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { InvestorInviteScope } from "@/lib/firestore/types";
import { getDeal, getMembership } from "@/lib/firestore/queries";
import { generateInviteToken, hashInviteToken } from "@/lib/invitations/token";
import { listDataRoomIdsForDeals } from "@/lib/invitations/data-rooms";
import { writeAuditLog } from "@/lib/audit";

function appBaseUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    req.headers.get("origin") ??
    "http://localhost:3000"
  );
}

function fromAddress(): string {
  return (
    process.env.RESEND_FROM ??
    process.env.OUTREACH_FROM_EMAIL ??
    "CPIN <onboarding@resend.dev>"
  );
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    scope?: InvestorInviteScope;
    dealId?: string;
    email?: string;
    message?: string;
    expiresInDays?: number;
    sendEmail?: boolean;
  };

  const scope = body.scope;
  if (scope !== "org" && scope !== "deal") {
    return NextResponse.json({ error: "scope must be org or deal" }, { status: 400 });
  }

  let dealIds: string[] = [];
  if (scope === "deal") {
    const dealId = typeof body.dealId === "string" ? body.dealId.trim() : "";
    if (!dealId) return NextResponse.json({ error: "dealId required for deal scope" }, { status: 400 });
    const deal = await getDeal(ctx.orgId, dealId);
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    dealIds = [dealId];
  }

  const expiresInDays =
    typeof body.expiresInDays === "number" && body.expiresInDays > 0 && body.expiresInDays <= 90
      ? body.expiresInDays
      : 14;

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const now = Date.now();

  const db = getAdminFirestore();
  const dataRoomIds =
    scope === "deal" ? await listDataRoomIdsForDeals(ctx.orgId, dealIds) : [];

  const email =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase()
      : undefined;

  const id = randomUUID();
  const inviteUrl = `${appBaseUrl(req)}/invite/${encodeURIComponent(rawToken)}`;

  await db
    .collection(col.investorInvitations)
    .doc(id)
    .set({
      id,
      organizationId: ctx.orgId,
      tokenHash,
      scope,
      dealIds,
      dataRoomIds,
      email,
      message: typeof body.message === "string" ? body.message.slice(0, 2000) : undefined,
      expiresAt: now + expiresInDays * 86400000,
      createdBy: ctx.user.uid,
      createdAt: now,
    });

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "invite.create",
    resource: `${col.investorInvitations}/${id}`,
    payload: { scope, dealIds, email },
  });

  const sendEmail = body.sendEmail === true;
  if (sendEmail) {
    try {
      const org = await db.collection(col.organizations).doc(ctx.orgId).get();
      const orgName = (org.data()?.name as string | undefined) ?? "Your organization";

      if (!process.env.RESEND_API_KEY) {
        return NextResponse.json(
          {
            error: "RESEND_API_KEY is not set — invite was created but email was not sent.",
            inviteUrl,
            inviteToken: rawToken,
            id,
          },
          { status: 500 },
        );
      }

      if (!email) {
        return NextResponse.json(
          {
            error: "Email is required when sendEmail is true.",
            inviteUrl,
            inviteToken: rawToken,
            id,
          },
          { status: 400 },
        );
      }

      const subject = `Invitation to view ${scope === "deal" ? "a deal" : "the investor portal"} — ${orgName}`;
      const html = `
        <p>You’ve been invited to the ${escapeHtml(orgName)} workspace on CPIN Capital Management System.</p>
        <p><a href="${inviteUrl}">Accept invitation</a></p>
        <p style="color:#666;font-size:12px">This link expires in ${expiresInDays} days.</p>
      `.trim();

      await sendTransactionalEmail({ from: fromAddress(), to: email, subject, html });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Email failed";
      console.error("[invitations] email", e);
      return NextResponse.json(
        { error: message, inviteUrl, inviteToken: rawToken, id },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    inviteUrl,
    inviteToken: rawToken,
    id,
  });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
