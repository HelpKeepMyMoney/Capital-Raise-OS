import { NextRequest, NextResponse } from "next/server";
import { verifyEsignToken } from "@/lib/esign/tokens";
import { getAdminBucket, getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { EsignEnvelope } from "@/lib/firestore/types";

/** Serves the current working PDF for an active signing session (token auth only). */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const payload = verifyEsignToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });

  const db = getAdminFirestore();
  const snap = await db.collection(col.esignEnvelopes).doc(payload.e).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const env = { id: snap.id, ...(snap.data() as Omit<EsignEnvelope, "id">) };
  if (env.nextSignerRole !== payload.r) {
    return NextResponse.json({ error: "This link is not active for the current signing step" }, { status: 409 });
  }
  if (env.status === "completed") {
    return NextResponse.json({ error: "Already completed" }, { status: 410 });
  }

  const storagePath = env.workingPdfStoragePath;
  if (!storagePath) return NextResponse.json({ error: "No document" }, { status: 404 });

  try {
    const bucket = getAdminBucket();
    const [buf] = await bucket.file(storagePath).download();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="agreement.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
      console.error("[esign sign-document]", e);
      return NextResponse.json({ error: "Could not load document" }, { status: 500 });
    }
}
