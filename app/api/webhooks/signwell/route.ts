import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col, dealCommitmentDocId, signingRequestDocId } from "@/lib/firestore/paths";
import type { SigningRequest, SigningRequestStatus } from "@/lib/firestore/types";
import type { DocumentReference } from "firebase-admin/firestore";

/** SignWell webhook — idempotent status sync. Optional SIGNWELL_WEBHOOK_SECRET header match for development. */
export async function POST(req: NextRequest) {
  const secret = process.env.SIGNWELL_WEBHOOK_SECRET;
  const sig = req.headers.get("x-signwell-signature") ?? req.headers.get("X-SignWell-Signature");
  if (secret && sig !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = payload as {
    event?: { type?: string; time?: number };
    data?: {
      object?: {
        id?: string;
        status?: string;
        metadata?: Record<string, string>;
      };
    };
  };

  const docId = body.data?.object?.id;
  const eventType = body.event?.type ?? "";
  if (!docId) return NextResponse.json({ ok: true, skipped: true });

  const meta = body.data?.object?.metadata ?? {};
  const orgId = meta.organizationId;
  const dealId = meta.dealId;
  const userId = meta.userId;

  const db = getAdminFirestore();

  let ref: DocumentReference | null = null;
  if (orgId && dealId && userId) {
    ref = db.collection(col.signingRequests).doc(signingRequestDocId(orgId, dealId, userId));
    const snap = await ref.get();
    if (!snap.exists) ref = null;
  }
  if (!ref) {
    const q = await db
      .collection(col.signingRequests)
      .where("signwellDocumentId", "==", docId)
      .limit(1)
      .get();
    if (!q.empty) ref = q.docs[0]!.ref;
  }
  if (!ref) return NextResponse.json({ ok: true, skipped: true });

  const statusMap: Record<string, SigningRequestStatus> = {
    document_sent: "sent",
    document_viewed: "viewed",
    document_signed: "viewed",
    document_completed: "completed",
    document_declined: "declined",
  };
  const status = statusMap[eventType];
  if (!status) {
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  const snap = await ref.get();
  const row = snap.data() as SigningRequest | undefined;
  await ref.set(
    {
      signwellDocumentId: docId,
      status,
      lastEventAt: Date.now(),
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  if (status === "completed" && row) {
    await db
      .collection(col.dealCommitments)
      .doc(dealCommitmentDocId(row.organizationId, row.dealId, row.userId))
      .set({ docStatus: "complete", updatedAt: Date.now() }, { merge: true });
  }

  return NextResponse.json({ ok: true });
}
