import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { verifyOutreachTrackingToken } from "@/lib/outreach/tracking-tokens";

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t");
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui;padding:48px;max-width:480px;margin:0 auto;">
<h1>Unsubscribed</h1>
<p>You will no longer receive outreach emails from this campaign.</p>
</body></html>`;

  if (!t) {
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const payload = verifyOutreachTrackingToken(t);
  const recipientId = payload?.touchId?.startsWith("unsub:")
    ? payload.touchId.slice("unsub:".length)
    : null;

  if (recipientId) {
    const db = getAdminFirestore();
    await db.collection(col.outreachRecipients).doc(recipientId).update({
      status: "unsubscribed",
      updatedAt: Date.now(),
    }).catch(() => {});
  }

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
