import { NextRequest } from "next/server";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { rejectForbiddenApiActions } from "@/lib/api/v1/guards";
import { v1BadRequest, v1Forbidden, v1Json, v1NotFound } from "@/lib/api/v1/responses";
import { serializeInvestor } from "@/lib/api/v1/serialize";
import { ApiInvestorPatchSchema, investorPatchToUpdate } from "@/lib/api/v1/investor-body";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getInvestor } from "@/lib/firestore/queries";

export async function GET(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    const { id } = await routeCtx.params;
    const investor = await getInvestor(ctx.orgId, id);
    if (!investor) return v1NotFound("Investor");
    return v1Json({ investor: serializeInvestor(investor) });
  });
}

export async function PATCH(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    const { id } = await routeCtx.params;
    const investor = await getInvestor(ctx.orgId, id);
    if (!investor) return v1NotFound("Investor");

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return v1BadRequest("Invalid JSON body");
    }

    const bodyObj = raw as Record<string, unknown>;
    const forbidden = rejectForbiddenApiActions(bodyObj);
    if (!forbidden.ok) return v1Forbidden(forbidden.message);

    const parsed = ApiInvestorPatchSchema.safeParse(raw);
    if (!parsed.success) {
      return v1BadRequest("Invalid body", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return v1BadRequest("No changes");
    }

    const now = Date.now();
    const updates = investorPatchToUpdate(investor, parsed.data, now);
    const db = getAdminFirestore();
    await db.collection(col.investors).doc(id).update(updates);

    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.actorId,
      action: "investor.update.api",
      resource: `${col.investors}/${id}`,
      payload: { keys: Object.keys(parsed.data) },
    });

    const updated = await getInvestor(ctx.orgId, id);
    if (!updated) return v1NotFound("Investor");
    return v1Json({ investor: serializeInvestor(updated) });
  });
}
