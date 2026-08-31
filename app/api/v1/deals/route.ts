import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { rejectDealStatusWrite, rejectForbiddenApiActions } from "@/lib/api/v1/guards";
import { v1BadRequest, v1Forbidden, v1Json } from "@/lib/api/v1/responses";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { Deal, DealType } from "@/lib/firestore/types";
import { listActiveDataRoomsForDeal, listDeals } from "@/lib/firestore/queries";

const DEAL_TYPES: DealType[] = [
  "startup_equity",
  "safe",
  "convertible_note",
  "real_estate_syndication",
  "lp_fund",
  "revenue_share",
  "private_bond",
];

function serializeDeal(deal: Deal, linkedRoomIds: string[]) {
  return {
    id: deal.id,
    name: deal.name,
    type: deal.type,
    status: deal.status,
    industry: deal.industry ?? null,
    stage: deal.stage ?? null,
    targetRaise: deal.targetRaise ?? null,
    minimumInvestment: deal.minimumInvestment ?? null,
    valuation: deal.valuation ?? null,
    closeDate: deal.closeDate ?? null,
    terms: deal.terms ?? null,
    useOfProceeds: deal.useOfProceeds ?? null,
    tractionMetrics: deal.tractionMetrics ?? [],
    useOfFundsSplit: deal.useOfFundsSplit ?? [],
    whyInvest: deal.whyInvest ?? [],
    marketOpportunity: deal.marketOpportunity ?? null,
    problem: deal.problem ?? null,
    solution: deal.solution ?? null,
    competitiveEdge: deal.competitiveEdge ?? null,
    growthStrategy: deal.growthStrategy ?? null,
    exitPotential: deal.exitPotential ?? null,
    returnsModel: deal.returnsModel ?? null,
    sponsorProfile: deal.sponsorProfile ?? null,
    linkedDataRoomIds: linkedRoomIds,
    createdAt: deal.createdAt,
  };
}

export async function GET(req: NextRequest) {
  return withApiKeyAuth(req, async (ctx) => {
    const deals = await listDeals(ctx.orgId);
    const withRooms = await Promise.all(
      deals.map(async (d) => {
        const rooms = await listActiveDataRoomsForDeal(ctx.orgId, d.id);
        return serializeDeal(d, rooms.map((r) => r.id));
      }),
    );
    return v1Json({ deals: withRooms });
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

    const statusCheck = rejectDealStatusWrite(body.status);
    if (!statusCheck.ok) return v1Forbidden(statusCheck.message);

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
      status: "draft",
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

    const db = getAdminFirestore();
    await db.collection(col.deals).doc(id).set(payload);

    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.actorId,
      action: "deal.create.api",
      resource: `${col.deals}/${id}`,
      payload: { name, type, status: "draft" },
    });

    const deal = { id, ...(payload as Omit<Deal, "id">) };
    return v1Json({ deal: serializeDeal(deal, []) }, 201);
  });
}
