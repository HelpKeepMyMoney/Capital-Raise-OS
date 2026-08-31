import { getDeal } from "@/lib/firestore/queries";

export async function dataRoomPatchToUpdate(
  orgId: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; updates: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return { ok: false, status: 400, error: "name cannot be empty" };
    updates.name = name;
  }

  if (body.dealId !== undefined) {
    if (body.dealId === null || body.dealId === "") {
      updates.dealId = null;
    } else if (typeof body.dealId === "string") {
      const deal = await getDeal(orgId, body.dealId.trim());
      if (!deal) return { ok: false, status: 404, error: "Deal not found" };
      updates.dealId = body.dealId.trim();
    } else {
      return { ok: false, status: 400, error: "Invalid dealId" };
    }
  }

  if (body.description !== undefined) {
    if (body.description === null) updates.description = null;
    else if (typeof body.description === "string") updates.description = body.description.trim().slice(0, 4000);
    else return { ok: false, status: 400, error: "Invalid description" };
  }

  if (body.ndaRequired !== undefined) updates.ndaRequired = Boolean(body.ndaRequired);

  if (body.visibility !== undefined) {
    if (body.visibility !== "open" && body.visibility !== "invite_only") {
      return { ok: false, status: 400, error: "Invalid visibility" };
    }
    updates.visibility = body.visibility;
  }

  if (body.downloadAllowed !== undefined) updates.downloadAllowed = Boolean(body.downloadAllowed);
  if (body.watermarkDocs !== undefined) updates.watermarkDocs = Boolean(body.watermarkDocs);

  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null) updates.expiresAt = null;
    else if (typeof body.expiresAt === "number" && body.expiresAt > 0) updates.expiresAt = body.expiresAt;
    else return { ok: false, status: 400, error: "Invalid expiresAt" };
  }

  if (body.requireLogin !== undefined) updates.requireLogin = Boolean(body.requireLogin);

  if (body.welcomeMessage !== undefined) {
    if (body.welcomeMessage === null) updates.welcomeMessage = null;
    else if (typeof body.welcomeMessage === "string") {
      updates.welcomeMessage = body.welcomeMessage.trim().slice(0, 8000);
    } else return { ok: false, status: 400, error: "Invalid welcomeMessage" };
  }

  if (body.archived !== undefined) updates.archived = Boolean(body.archived);

  if (Object.keys(updates).length === 0) {
    return { ok: false, status: 400, error: "No changes" };
  }

  updates.updatedAt = Date.now();
  return { ok: true, updates };
}
