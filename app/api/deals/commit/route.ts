import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { memberCanAccessDeal } from "@/lib/auth/investor-access";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col, dealCommitmentDocId } from "@/lib/firestore/paths";
import { getDeal, getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";

const CURRENCIES = new Set(["USD"]);

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    dealId?: string;
    amount?: number;
    currency?: string;
    withdraw?: boolean;
  };

  const dealId = typeof body.dealId === "string" ? body.dealId.trim() : "";
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (membership.role !== "investor_guest") {
    return NextResponse.json(
      { error: "Only invited investors can record a commitment from this portal." },
      { status: 403 },
    );
  }

  const deal = await getDeal(ctx.orgId, dealId);
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!memberCanAccessDeal(membership, dealId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currency = typeof body.currency === "string" && body.currency ? body.currency : "USD";
  if (!CURRENCIES.has(currency)) {
    return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
  }

  const db = getAdminFirestore();
  const docId = dealCommitmentDocId(ctx.orgId, dealId, ctx.user.uid);
  const now = Date.now();

  if (body.withdraw === true) {
    const wref = db.collection(col.dealCommitments).doc(docId);
    const prevSnap = await wref.get();
    const prevCreated = prevSnap.exists ? (prevSnap.data()?.createdAt as number | undefined) : undefined;

    await wref.set(
      {
        id: docId,
        organizationId: ctx.orgId,
        dealId,
        userId: ctx.user.uid,
        amount: 0,
        currency,
        status: "withdrawn" as const,
        updatedAt: now,
        createdAt: prevCreated ?? now,
      },
      { merge: true },
    );

    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.user.uid,
      action: "deal.commit_withdraw",
      resource: `${col.dealCommitments}/${docId}`,
    });

    return NextResponse.json({ ok: true, withdrawn: true });
  }

  const amount = typeof body.amount === "number" && Number.isFinite(body.amount) ? body.amount : NaN;
  if (!(amount >= 1) || amount > 1_000_000_000_000) {
    return NextResponse.json({ error: "amount must be at least 1 (whole currency units)." }, { status: 400 });
  }

  const creff = db.collection(col.dealCommitments).doc(docId);
  const existing = await creff.get();
  const prevCreatedAt = existing.exists ? (existing.data()?.createdAt as number | undefined) : undefined;

  await creff.set(
    {
      id: docId,
      organizationId: ctx.orgId,
      dealId,
      userId: ctx.user.uid,
      amount: Math.floor(amount),
      currency,
      status: "active" as const,
      updatedAt: now,
      createdAt: prevCreatedAt ?? now,
    },
    { merge: true },
  );

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "deal.commit_amount",
    resource: `${col.deals}/${dealId}`,
    payload: { amount: Math.floor(amount), currency },
  });

  const activityId = randomUUID();
  await db.collection(col.activities).doc(activityId).set({
    id: activityId,
    organizationId: ctx.orgId,
    type: "deal_commit",
    summary: `Stated commitment of ${currency} ${Math.floor(amount)} for ${deal.name}`,
    actorId: ctx.user.uid,
    metadata: { dealId: deal.id, dealName: deal.name, amount: Math.floor(amount), currency },
    createdAt: now,
  });

  return NextResponse.json({ ok: true });
}
