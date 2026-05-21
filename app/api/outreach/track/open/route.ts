import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { verifyOutreachTrackingToken } from "@/lib/outreach/tracking-tokens";
import { recordOutreachEvent } from "@/lib/outreach/events";
import { handleOutreachEventSideEffects } from "@/lib/outreach/engine";

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t");
  if (!t) return transparentPng();

  const payload = verifyOutreachTrackingToken(t);
  if (!payload) return transparentPng();

  const db = getAdminFirestore();
  const touchSnap = await db.collection(col.outreachTouches).doc(payload.touchId).get();
  if (!touchSnap.exists) {
    const legacyQ = await db.collection(col.emails).where("openToken", "==", t).limit(1).get();
    if (!legacyQ.empty) {
      const doc = legacyQ.docs[0]!;
      const cur = (doc.get("openCount") as number) ?? 0;
      await doc.ref.update({ openCount: cur + 1 });
    }
    return transparentPng();
  }

  const touch = touchSnap.data()!;
  const lastOpen = (touch.lastOpenAt as number) ?? 0;
  if (Date.now() - lastOpen < 3600000) {
    return transparentPng();
  }

  await touchSnap.ref.update({
    openCount: ((touch.openCount as number) ?? 0) + 1,
    lastOpenAt: Date.now(),
  });

  const legacyId = touch.legacyEmailId as string | undefined;
  if (legacyId) {
    await db.collection(col.emails).doc(legacyId).update({
      openCount: ((touch.openCount as number) ?? 0) + 1,
    }).catch(() => {});
  }

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
      eventType: "email_opened",
      touchId: payload.touchId,
    });

    const campaignSnap = await db.collection(col.campaigns).doc(campaignId).get();
    await handleOutreachEventSideEffects(db, {
      organizationId,
      campaignId,
      recipientId,
      investorId,
      eventType: "email_opened",
      relatedDealId: campaignSnap.data()?.relatedDealId as string | undefined,
    });
  }

  return transparentPng();
}

function transparentPng() {
  const buf = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
