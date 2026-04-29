import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getDeal, getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";
import type { DataRoomVisibility } from "@/lib/firestore/types";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    ndaRequired?: boolean;
    dealId?: string | null;
    description?: string | null;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const ndaRequired = Boolean(body.ndaRequired);
  let dealId: string | undefined;
  if (body.dealId != null) {
    const raw = typeof body.dealId === "string" ? body.dealId.trim() : "";
    if (raw) {
      const deal = await getDeal(ctx.orgId, raw);
      if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
      dealId = raw;
    }
  }

  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, 4000) : undefined;

  const id = randomUUID();
  const now = Date.now();

  const db = getAdminFirestore();
  const payload: Record<string, unknown> = {
    id,
    organizationId: ctx.orgId,
    name,
    ndaRequired,
    visibility: "open" satisfies DataRoomVisibility,
    downloadAllowed: true,
    createdAt: now,
    updatedAt: now,
  };
  if (dealId) payload.dealId = dealId;
  if (description) payload.description = description;

  await db.collection(col.dataRooms).doc(id).set(payload);

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "data_room.create",
    resource: `${col.dataRooms}/${id}`,
    payload: { name, ndaRequired },
  });

  return NextResponse.json({ id, name, ndaRequired, dealId: dealId ?? null, createdAt: now });
}
