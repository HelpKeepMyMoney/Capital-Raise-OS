import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { verifyOutreachTrackingToken } from "@/lib/outreach/tracking-tokens";
import { recordOutreachEvent } from "@/lib/outreach/events";
import { handleOutreachEventSideEffects } from "@/lib/outreach/engine";

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t");
  const fallback = req.nextUrl.origin;

  if (!t) {
    return NextResponse.redirect(fallback, { status: 302 });
  }

  const payload = verifyOutreachTrackingToken(t);
  if (!payload?.url) {
    return NextResponse.redirect(fallback, { status: 302 });
  }

  const db = getAdminFirestore();
  const touchSnap = await db.collection(col.outreachTouches).doc(payload.touchId).get();
  if (touchSnap.exists) {
    const touch = touchSnap.data()!;
    await touchSnap.ref.update({
      clickCount: ((touch.clickCount as number) ?? 0) + 1,
    });

    const campaignId = touch.campaignId as string;
    const recipientId = touch.recipientId as string;
    const investorId = touch.investorId as string;
    const organizationId = touch.organizationId as string;

    if (campaignId && recipientId && investorId) {
      await recordOutreachEvent(db, {
        organizationId,
        campaignId,
        recipientId,
        investorId,
        eventType: "email_clicked",
        touchId: payload.touchId,
        metadata: { url: payload.url },
      });

      const campaignSnap = await db.collection(col.campaigns).doc(campaignId).get();
      await handleOutreachEventSideEffects(db, {
        organizationId,
        campaignId,
        recipientId,
        investorId,
        eventType: "email_clicked",
        relatedDealId: campaignSnap.data()?.relatedDealId as string | undefined,
        metadata: { url: payload.url },
      });
    }
  }

  return NextResponse.redirect(payload.url, { status: 302 });
}
