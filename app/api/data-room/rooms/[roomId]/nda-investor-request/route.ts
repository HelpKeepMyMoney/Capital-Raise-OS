import { NextRequest, NextResponse } from "next/server";
import { memberCanAccessDataRoom } from "@/lib/auth/investor-access";
import { requireOrgSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { normalizeInvestorEmailForNda, resolveInvestorPendingDataRoomNdaForRooms } from "@/lib/data-room/investor-nda-gate";
import { roomNdaInvestorRequestDocId } from "@/lib/data-room/nda-investor-request";
import { resolveDealSubscriptionSponsorEmails } from "@/lib/esign/subscription-sponsor-emails";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { DataRoom } from "@/lib/firestore/types";
import { getMembership, getOrganization } from "@/lib/firestore/queries";
import { escapeHtmlForEmail, invitationsTransactionalFrom } from "@/lib/invitations/invite-email-shared";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

function appBaseUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    req.headers.get("origin") ??
    "http://localhost:3000"
  );
}

export async function POST(
  req: NextRequest,
  ctxParams: { params: Promise<{ roomId: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || m.role !== "investor_guest") {
    return NextResponse.json({ error: "Only investor guests may use this action" }, { status: 403 });
  }

  const { roomId: rawRoomId } = await ctxParams.params;
  const roomId = typeof rawRoomId === "string" ? rawRoomId.trim() : "";
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

  const rl = checkRateLimit(rateLimitKey(ctx.user.uid, `nda-investor-req:${roomId}`), 6, 86_400_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "You can only request this a few times per day. Try again later." },
      { status: 429 },
    );
  }

  const db = getAdminFirestore();
  const roomSnap = await db.collection(col.dataRooms).doc(roomId).get();
  if (!roomSnap.exists) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const room = { id: roomSnap.id, ...(roomSnap.data() as Omit<DataRoom, "id">) } as DataRoom;
  if (room.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!room.ndaRequired) {
    return NextResponse.json({ error: "This room does not require an NDA" }, { status: 400 });
  }
  if (room.archived) {
    return NextResponse.json({ error: "Room is archived" }, { status: 400 });
  }

  if (!memberCanAccessDataRoom(m, roomId, { dealId: room.dealId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const emailNorm = normalizeInvestorEmailForNda(ctx.user.email);
  const pendingMap = await resolveInvestorPendingDataRoomNdaForRooms(db, ctx.orgId, emailNorm, [roomId]);
  const pending = pendingMap.get(roomId);
  if (pending?.kind === "sign_now") {
    return NextResponse.json(
      {
        error:
          "You already have an active signing link — use Open NDA signing on the data room page (or refresh if you just completed sponsor steps).",
      },
      { status: 409 },
    );
  }
  if (pending?.kind === "await_sponsor") {
    return NextResponse.json(
      { error: "The sponsor is signing first. Watch your email for a link when it is your turn." },
      { status: 409 },
    );
  }

  const org = await getOrganization(ctx.orgId);
  const orgName = org?.name?.trim() ? org.name : "CapitalOS";
  const roomName = typeof room.name === "string" && room.name.trim() ? room.name : roomId;
  const dataRoomLink = room.dealId
    ? `${appBaseUrl(req)}/data-room?deal=${encodeURIComponent(room.dealId)}`
    : `${appBaseUrl(req)}/data-room`;

  const investorEmail = ctx.user.email?.trim().toLowerCase() ?? "";
  const invName = typeof ctx.user.name === "string" ? ctx.user.name.trim() : "";
  const invLabel = escapeHtmlForEmail(invName || investorEmail || "An investor");
  const invMailHtml = investorEmail ? escapeHtmlForEmail(investorEmail) : "";

  const sponsorEmails = org ? await resolveDealSubscriptionSponsorEmails(org) : [];
  const now = Date.now();
  const docId = roomNdaInvestorRequestDocId(ctx.orgId, roomId, ctx.user.uid);
  const ref = db.collection(col.roomNdaInvestorRequests).doc(docId);
  const prev = await ref.get();
  const row: Record<string, unknown> = {
    organizationId: ctx.orgId,
    roomId,
    investorUid: ctx.user.uid,
    investorEmailNorm: emailNorm || null,
    lastRequestedAt: now,
    updatedAt: now,
  };
  if (!prev.exists) row.createdAt = now;
  await ref.set(row, { merge: true });

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "nda.investor_request",
    resource: `${col.roomNdaInvestorRequests}/${docId}`,
    payload: { roomId, dealId: room.dealId ?? null },
  });

  let emailed = false;
  if (process.env.RESEND_API_KEY && sponsorEmails.length > 0) {
    const from = invitationsTransactionalFrom();
    const roomSafe = escapeHtmlForEmail(roomName);
    const orgSafe = escapeHtmlForEmail(orgName);
    const href = dataRoomLink.replace(/"/g, "&quot;");
    const html = `<p>An investor (${invLabel}${invMailHtml ? ` — ${invMailHtml}` : ""}) asked you to send or continue the mutual NDA for the data room <strong>${roomSafe}</strong> (${orgSafe}).</p>
<p>Open the data room, select this room, then use <strong>Settings → Send for signature (e-sign)</strong> to create the envelope if you have not yet.</p>
<p><a href="${href}">Open data room</a></p>`;
    try {
      await sendTransactionalEmail({
        from,
        to: sponsorEmails.length === 1 ? sponsorEmails[0]! : sponsorEmails,
        subject: `NDA requested — ${orgName}`,
        html,
        replyTo: investorEmail || undefined,
      });
      emailed = true;
    } catch (e) {
      console.error("[nda-investor-request] email", e);
    }
  }

  return NextResponse.json({ ok: true, emailed });
}
