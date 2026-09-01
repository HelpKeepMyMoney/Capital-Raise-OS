import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { rejectForbiddenApiActions } from "@/lib/api/v1/guards";
import { v1BadRequest, v1Forbidden, v1Json } from "@/lib/api/v1/responses";
import { serializeInvestor } from "@/lib/api/v1/serialize";
import { ApiInvestorCreateSchema, investorCreateToDoc } from "@/lib/api/v1/investor-body";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { listInvestors } from "@/lib/firestore/queries";
import type { Investor } from "@/lib/firestore/types";

export async function GET(req: NextRequest) {
  return withApiKeyAuth(req, async (ctx) => {
    const investors = await listInvestors(ctx.orgId);
    return v1Json({ investors: investors.map(serializeInvestor) });
  });
}

export async function POST(req: NextRequest) {
  return withApiKeyAuth(req, async (ctx) => {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return v1BadRequest("Invalid JSON body");
    }

    const bodyObj = raw as Record<string, unknown>;
    const forbidden = rejectForbiddenApiActions(bodyObj);
    if (!forbidden.ok) return v1Forbidden(forbidden.message);

    const parsed = ApiInvestorCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return v1BadRequest("Invalid body", parsed.error.flatten());
    }

    const id = randomUUID();
    const now = Date.now();
    const payload = investorCreateToDoc(ctx.orgId, parsed.data, now);
    payload.id = id;

    const db = getAdminFirestore();
    await db.collection(col.investors).doc(id).set(payload);

    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.actorId,
      action: "investor.create.api",
      resource: `${col.investors}/${id}`,
      payload: { name: payload.name, pipelineStage: payload.pipelineStage },
    });

    const investor = { id, ...(payload as Omit<Investor, "id">) };
    return v1Json({ investor: serializeInvestor(investor) }, 201);
  });
}
