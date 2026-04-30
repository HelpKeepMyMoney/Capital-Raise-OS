import { NextRequest, NextResponse } from "next/server";
import { memberCanAccessDataRoom } from "@/lib/auth/investor-access";
import { requireOrgSession } from "@/lib/auth/session";
import { normalizeInvestorEmailForNda } from "@/lib/data-room/investor-nda-gate";
import { getAdminBucket, getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import type { EsignEnvelope } from "@/lib/firestore/types";

export async function GET(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roomId = req.nextUrl.searchParams.get("roomId")?.trim() ?? "";
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  if (!membership || !memberCanAccessDataRoom(membership, roomId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const emailNorm = normalizeInvestorEmailForNda(ctx.user.email);
  if (!emailNorm) return NextResponse.json({ error: "Account email missing" }, { status: 400 });

  const db = getAdminFirestore();
  const snap = await db
    .collection(col.esignEnvelopes)
    .where("organizationId", "==", ctx.orgId)
    .where("investorEmailNorm", "==", emailNorm)
    .where("status", "==", "completed")
    .limit(300)
    .get();

  let latest: { env: EsignEnvelope; id: string; signedAt: number } | null = null;
  for (const d of snap.docs) {
    const env = d.data() as Omit<EsignEnvelope, "id">;
    if (env.context.kind !== "data_room_nda") continue;
    if (env.context.dataRoomId !== roomId) continue;
    if (!env.finalPdfStoragePath?.trim()) continue;
    const signedAt = env.updatedAt ?? env.lastEventAt ?? env.createdAt ?? 0;
    if (!latest || signedAt > latest.signedAt) latest = { env: { id: d.id, ...env }, id: d.id, signedAt };
  }

  if (!latest) return NextResponse.json({ error: "Completed NDA not found yet" }, { status: 404 });

  try {
    const [buf] = await getAdminBucket().file(latest.env.finalPdfStoragePath!).download();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nda-${roomId}-signed.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[esign room-nda final-document]", e);
    return NextResponse.json({ error: "Could not load completed NDA" }, { status: 500 });
  }
}
