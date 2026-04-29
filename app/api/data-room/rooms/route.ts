import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { name?: string; ndaRequired?: boolean };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const ndaRequired = Boolean(body.ndaRequired);
  const id = randomUUID();
  const now = Date.now();

  const db = getAdminFirestore();
  await db.collection(col.dataRooms).doc(id).set({
    id,
    organizationId: ctx.orgId,
    name,
    ndaRequired,
    createdAt: now,
  });

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "data_room.create",
    resource: `${col.dataRooms}/${id}`,
    payload: { name, ndaRequired },
  });

  return NextResponse.json({ id, name, ndaRequired, createdAt: now });
}
