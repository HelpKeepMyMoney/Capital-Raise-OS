import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getDeal, getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";
import type { DataRoomVisibility } from "@/lib/firestore/types";

export async function PATCH(
  req: NextRequest,
  ctxParams: { params: Promise<{ roomId: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { roomId } = await ctxParams.params;
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

  const body = (await req.json()) as Partial<{
    name: string;
    dealId: string | null;
    description: string | null;
    ndaRequired: boolean;
    ndaTemplateRef: string | null;
    visibility: DataRoomVisibility;
    downloadAllowed: boolean;
    watermarkDocs: boolean;
    expiresAt: number | null;
    requireLogin: boolean;
    welcomeMessage: string | null;
    archived: boolean;
  }>;

  const db = getAdminFirestore();
  const ref = db.collection(col.dataRooms).doc(roomId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const existing = snap.data() as { organizationId?: string };
  if (existing.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    updates.name = name;
  }

  if (body.dealId !== undefined) {
    if (body.dealId === null || body.dealId === "") {
      updates.dealId = null;
    } else {
      const deal = await getDeal(ctx.orgId, body.dealId.trim());
      if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
      updates.dealId = body.dealId.trim();
    }
  }

  if (body.description !== undefined) {
    updates.description =
      body.description === null
        ? null
        : typeof body.description === "string"
          ? body.description.trim().slice(0, 4000)
          : undefined;
    if (updates.description === undefined) delete updates.description;
  }

  if (body.ndaRequired !== undefined) {
    updates.ndaRequired = Boolean(body.ndaRequired);
  }

  if (body.ndaTemplateRef !== undefined) {
    updates.ndaTemplateRef =
      body.ndaTemplateRef === null || body.ndaTemplateRef === ""
        ? null
        : String(body.ndaTemplateRef).slice(0, 500);
  }

  if (body.visibility !== undefined) {
    if (body.visibility !== "open" && body.visibility !== "invite_only") {
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    }
    updates.visibility = body.visibility;
  }

  if (body.downloadAllowed !== undefined) {
    updates.downloadAllowed = Boolean(body.downloadAllowed);
  }

  if (body.watermarkDocs !== undefined) {
    updates.watermarkDocs = Boolean(body.watermarkDocs);
  }

  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null) {
      updates.expiresAt = null;
    } else if (typeof body.expiresAt === "number" && body.expiresAt > 0) {
      updates.expiresAt = body.expiresAt;
    } else {
      return NextResponse.json({ error: "Invalid expiresAt" }, { status: 400 });
    }
  }

  if (body.requireLogin !== undefined) {
    updates.requireLogin = Boolean(body.requireLogin);
  }

  if (body.welcomeMessage !== undefined) {
    updates.welcomeMessage =
      body.welcomeMessage === null
        ? null
        : typeof body.welcomeMessage === "string"
          ? body.welcomeMessage.trim().slice(0, 8000)
          : undefined;
    if (updates.welcomeMessage === undefined) delete updates.welcomeMessage;
  }

  if (body.archived !== undefined) {
    updates.archived = Boolean(body.archived);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  updates.updatedAt = Date.now();

  await ref.update(updates);

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "data_room.update",
    resource: `${col.dataRooms}/${roomId}`,
    payload: updates,
  });

  return NextResponse.json({ ok: true, id: roomId, ...updates });
}
