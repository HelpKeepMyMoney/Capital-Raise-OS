import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { parseDealStatusWrite, rejectForbiddenApiActions } from "@/lib/api/v1/guards";
import { v1BadRequest, v1Forbidden, v1Json } from "@/lib/api/v1/responses";
import { serializeDeal } from "@/lib/api/v1/serialize";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { Deal, DealStatus, DealType } from "@/lib/firestore/types";
import { listDataRoomsForOrganization, listDeals } from "@/lib/firestore/queries";

const DEAL_TYPES: DealType[] = [
  "startup_equity",
  "safe",
  "convertible_note",
  "real_estate_syndication",
  "lp_fund",
  "revenue_share",
  "private_bond",
];

function roomsByDealId(rooms: { id: string; dealId?: string; archived?: boolean }[]) {
  const map = new Map<string, string[]>();
  for (const r of rooms) {
    if (r.archived || !r.dealId) continue;
    const list = map.get(r.dealId) ?? [];
    list.push(r.id);
    map.set(r.dealId, list);
  }
  return map;
}

export async function GET(req: NextRequest) {
  return withApiKeyAuth(req, async (ctx) => {
    const [deals, rooms] = await Promise.all([
      listDeals(ctx.orgId),
      listDataRoomsForOrganization(ctx.orgId, 120),
    ]);
    const linked = roomsByDealId(rooms);
    return v1Json({ deals: deals.map((d) => serializeDeal(d, linked.get(d.id) ?? [])) });
  });
}

export async function POST(req: NextRequest) {
  return withApiKeyAuth(req, async (ctx) => {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return v1BadRequest("Invalid JSON body");
    }

    const forbidden = rejectForbiddenApiActions(body);
    if (!forbidden.ok) return v1Forbidden(forbidden.message);

    const statusCheck = parseDealStatusWrite(body.status);
    if (!statusCheck.ok) return v1BadRequest(statusCheck.message);
    const status: DealStatus = statusCheck.status ?? "draft";

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return v1BadRequest("name is required");

    const type = body.type as DealType;
    if (!type || !DEAL_TYPES.includes(type)) {
      return v1BadRequest("Invalid deal type");
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

    if (typeof body.targetRaise === "number" && body.targetRaise > 0) payload.targetRaise = body.targetRaise;
    if (typeof body.minimumInvestment === "number" && body.minimumInvestment > 0) {
      payload.minimumInvestment = body.minimumInvestment;
    }
    if (typeof body.valuation === "number" && body.valuation > 0) payload.valuation = body.valuation;
    if (typeof body.terms === "string" && body.terms.trim()) payload.terms = body.terms.trim();
    if (typeof body.useOfProceeds === "string" && body.useOfProceeds.trim()) {
      payload.useOfProceeds = body.useOfProceeds.trim();
    }
    if (typeof body.closeDate === "number" && body.closeDate > 0) payload.closeDate = body.closeDate;
    if (typeof body.industry === "string" && body.industry.trim()) payload.industry = body.industry.trim();
    if (typeof body.stage === "string" && body.stage.trim()) payload.stage = body.stage.trim();
    if (typeof body.tagline === "string" && body.tagline.trim()) payload.tagline = body.tagline.trim();

    const db = getAdminFirestore();
    await db.collection(col.deals).doc(id).set(payload);

    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.actorId,
      action: "deal.create.api",
      resource: `${col.deals}/${id}`,
      payload: { name, type, status },
    });

    const deal = { id, ...(payload as Omit<Deal, "id">) };
    return v1Json({ deal: serializeDeal(deal, []) }, 201);
  });
}
