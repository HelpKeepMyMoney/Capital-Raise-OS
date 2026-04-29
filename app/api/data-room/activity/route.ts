import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/firestore/queries";
import { listDataRoomActivityFeed } from "@/lib/data-room/server-queries";

export async function GET(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(80, Math.max(5, Number(limitParam) || 40));

  const items = await listDataRoomActivityFeed(ctx.orgId, limit);

  return NextResponse.json({ items });
}
