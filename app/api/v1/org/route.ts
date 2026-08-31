import { NextRequest } from "next/server";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { buildOrgPipelineSummary } from "@/lib/api/v1/org-summary";
import { v1Json } from "@/lib/api/v1/responses";
import { getOrganization } from "@/lib/firestore/queries";

export async function GET(req: NextRequest) {
  return withApiKeyAuth(req, async (ctx) => {
    const [org, summary] = await Promise.all([
      getOrganization(ctx.orgId),
      buildOrgPipelineSummary(ctx.orgId),
    ]);
    return v1Json({
      organization: org
        ? { id: org.id, name: org.name, slug: org.slug }
        : { id: ctx.orgId, name: null, slug: null },
      pipeline: summary,
    });
  });
}
