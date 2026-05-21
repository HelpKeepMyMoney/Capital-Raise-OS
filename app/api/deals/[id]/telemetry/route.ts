import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { memberCanAccessDeal } from "@/lib/auth/investor-access";
import { requireOrgSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getDeal, getMembership } from "@/lib/firestore/queries";
import { z } from "zod";

const TelemetryEventSchema = z.enum([
  "page_view",
  "cta_commit_click",
  "cta_data_room_click",
  "cta_book_call_click",
  "cta_express_interest",
  "cta_download_summary",
  "cta_view_documents",
]);

const BodySchema = z
  .object({
    event: TelemetryEventSchema,
    /** Client idempotency / session bucket (optional). */
    clientId: z.string().max(200).optional(),
  })
  .strict();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: dealId } = await ctx.params;
  const membership = await getMembership(session.orgId, session.user.uid);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!memberCanAccessDeal(membership, dealId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deal = await getDeal(session.orgId, dealId);
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { event, clientId } = parsed.data;
  const now = Date.now();

  try {
    await writeAuditLog({
      organizationId: session.orgId,
      actorId: session.user.uid,
      action: "deal.telemetry",
      resource: `${col.deals}/${dealId}`,
      payload: { dealId, event, dealName: deal.name, clientId },
    });

    const activityId = randomUUID();
    const db = getAdminFirestore();
    await db.collection(col.activities).doc(activityId).set({
      id: activityId,
      organizationId: session.orgId,
      dealId,
      type: "deal_telemetry",
      summary: `Deal engagement: ${event}`,
      actorId: session.user.uid,
      metadata: { event, clientId },
      createdAt: now,
    });
    if (event === "cta_data_room_click" || event === "cta_book_call_click") {
      const invSnap = await db
        .collection(col.investors)
        .where("organizationId", "==", session.orgId)
        .where("linkedUserId", "==", session.user.uid)
        .limit(1)
        .get();
      const investorId = invSnap.docs[0]?.id;
      if (investorId) {
        const { bridgeDataRoomViewToOutreach } = await import("@/lib/outreach/data-room-bridge");
        const { recordOutreachEvent } = await import("@/lib/outreach/events");
        const { handleOutreachEventSideEffects } = await import("@/lib/outreach/engine");

        if (event === "cta_data_room_click") {
          await bridgeDataRoomViewToOutreach(db, {
            organizationId: session.orgId,
            investorId,
            dealId,
            metadata: { source: "deal_telemetry" },
          });
        } else {
          const campaignsSnap = await db
            .collection(col.campaigns)
            .where("organizationId", "==", session.orgId)
            .where("status", "==", "active")
            .limit(5)
            .get();
          for (const cDoc of campaignsSnap.docs) {
            const recSnap = await db
              .collection(col.outreachRecipients)
              .where("campaignId", "==", cDoc.id)
              .where("investorId", "==", investorId)
              .limit(1)
              .get();
            if (recSnap.empty) continue;
            const recipient = recSnap.docs[0]!;
            await recordOutreachEvent(db, {
              organizationId: session.orgId,
              campaignId: cDoc.id,
              recipientId: recipient.id,
              investorId,
              eventType: "meeting_booked",
              metadata: { source: "deal_telemetry" },
            });
            await handleOutreachEventSideEffects(db, {
              organizationId: session.orgId,
              campaignId: cDoc.id,
              recipientId: recipient.id,
              investorId,
              eventType: "meeting_booked",
              relatedDealId: dealId,
            });
            break;
          }
        }
      }
    }
  } catch (err) {
    console.error("[deal telemetry] persistence skipped:", err);
  }

  return NextResponse.json({ ok: true });
}
