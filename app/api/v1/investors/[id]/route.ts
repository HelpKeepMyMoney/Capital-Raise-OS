import { NextRequest } from "next/server";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { v1Json, v1NotFound } from "@/lib/api/v1/responses";
import { getInvestor } from "@/lib/firestore/queries";
import type { Investor } from "@/lib/firestore/types";

function serializeInvestor(inv: Investor) {
  return {
    id: inv.id,
    name: inv.name,
    firstName: inv.firstName ?? null,
    lastName: inv.lastName ?? null,
    firm: inv.firm ?? null,
    email: inv.email ?? null,
    phone: inv.phone ?? null,
    pipelineStage: inv.pipelineStage,
    committedAmount: inv.committedAmount ?? null,
    investProbability: inv.investProbability ?? null,
    interestedDealIds: inv.interestedDealIds ?? [],
    checkSizeMin: inv.checkSizeMin ?? null,
    checkSizeMax: inv.checkSizeMax ?? null,
    lastContactAt: inv.lastContactAt ?? null,
    notes: inv.notes ?? null,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}

export async function GET(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    const { id } = await routeCtx.params;
    const investor = await getInvestor(ctx.orgId, id);
    if (!investor) return v1NotFound("Investor");
    return v1Json({ investor: serializeInvestor(investor) });
  });
}
