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
  } catch (err) {
    console.error("[deal telemetry] persistence skipped:", err);
  }

  return NextResponse.json({ ok: true });
}
