import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";
import type { DealStatus, DealType } from "@/lib/firestore/types";

const DEAL_TYPES: DealType[] = [
  "startup_equity",
  "safe",
  "convertible_note",
  "real_estate_syndication",
  "lp_fund",
  "revenue_share",
  "private_bond",
];

const DEAL_STATUSES: DealStatus[] = ["draft", "active", "closing", "closed", "cancelled"];

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    type?: string;
    status?: string;
    targetRaise?: number;
    minimumInvestment?: number;
    valuation?: number;
    terms?: string;
    useOfProceeds?: string;
    closeDate?: number | null;
  };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const type = body.type as DealType;
  if (!type || !DEAL_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid deal type" }, { status: 400 });
  }

  const status = (body.status as DealStatus) ?? "active";
  if (!DEAL_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const id = randomUUID();
  const now = Date.now();

  const payload: Record<string, unknown> = {
    id,
    organizationId: ctx.orgId,
    name,
    type,
    status,
    createdAt: now,
  };

  if (typeof body.targetRaise === "number" && body.targetRaise > 0) {
    payload.targetRaise = body.targetRaise;
  }
  if (typeof body.minimumInvestment === "number" && body.minimumInvestment > 0) {
    payload.minimumInvestment = body.minimumInvestment;
  }
  if (typeof body.valuation === "number" && body.valuation > 0) {
    payload.valuation = body.valuation;
  }
  if (typeof body.terms === "string" && body.terms.trim()) {
    payload.terms = body.terms.trim();
  }
  if (typeof body.useOfProceeds === "string" && body.useOfProceeds.trim()) {
    payload.useOfProceeds = body.useOfProceeds.trim();
  }
  if (typeof body.closeDate === "number" && body.closeDate > 0) {
    payload.closeDate = body.closeDate;
  }

  const db = getAdminFirestore();
  await db.collection(col.deals).doc(id).set(payload);

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "deal.create",
    resource: `${col.deals}/${id}`,
    payload: { name, type, status },
  });

  return NextResponse.json({ id });
}
