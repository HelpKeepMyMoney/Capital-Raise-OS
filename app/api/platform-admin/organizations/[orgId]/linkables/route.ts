import { NextResponse } from "next/server";
import {
  getOrganization,
  listDataRoomsForOrganization,
  listDeals,
} from "@/lib/firestore/queries";
import { requirePlatformAdminApi } from "@/lib/platform-admin/require-platform-admin";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orgId: string }> },
) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { orgId } = await ctx.params;
  const org = await getOrganization(orgId);
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [deals, dataRooms] = await Promise.all([
    listDeals(orgId),
    listDataRoomsForOrganization(orgId, 400),
  ]);

  return NextResponse.json({
    organizationId: orgId,
    deals: deals.map((d) => ({ id: d.id, name: d.name })),
    dataRooms: dataRooms.map((r) => ({
      id: r.id,
      name: r.name,
      dealId: r.dealId ?? null,
      archived: Boolean(r.archived),
    })),
  });
}
