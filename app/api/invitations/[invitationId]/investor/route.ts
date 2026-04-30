import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canEditOrgData, isInvestorGuestRole } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { PipelineStageSchema, type InvestorInvitation, type PipelineStage } from "@/lib/firestore/types";
import { getMembership } from "@/lib/firestore/queries";
import { resolveInvestorIdForInvitation } from "@/lib/invitations/resolve-invitation-investor";
import type { Firestore } from "firebase-admin/firestore";

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark_warm") }),
  z.object({ action: z.literal("move_docs_sent") }),
  z.object({ action: z.literal("move_committed") }),
  z.object({ action: z.literal("assign_owner"), ownerUserId: z.string().min(1) }),
]);

function stageLabel(s: PipelineStage): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function insertActivity(db: Firestore, input: {
  organizationId: string;
  investorId: string;
  type: string;
  summary: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}) {
  const id = randomUUID();
  const now = Date.now();
  await db.collection(col.activities).doc(id).set({
    id,
    organizationId: input.organizationId,
    investorId: input.investorId,
    type: input.type,
    summary: input.summary,
    actorId: input.actorId,
    ...(input.metadata ? { metadata: input.metadata } : {}),
    createdAt: now,
  });
}

/** Update linked CRM investor from a Data Room invitation row. */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ invitationId: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  if (!membership || !canEditOrgData(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { invitationId } = await context.params;
  const id = typeof invitationId === "string" ? invitationId.trim() : "";
  if (!id) return NextResponse.json({ error: "Invalid invitation id" }, { status: 400 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  }

  const db = getAdminFirestore();
  const invRef = db.collection(col.investorInvitations).doc(id);
  const snap = await invRef.get();
  if (!snap.exists) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  const inv = { id: snap.id, ...(snap.data() as Omit<InvestorInvitation, "id">) };
  if (inv.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!inv.acceptedAt) {
    return NextResponse.json(
      { error: "CRM updates apply after the invitation is accepted and a profile is linked." },
      { status: 400 },
    );
  }

  const investorId = await resolveInvestorIdForInvitation(db, ctx.orgId, inv);
  if (!investorId) {
    return NextResponse.json(
      { error: "No CRM investor record found for this invitation." },
      { status: 400 },
    );
  }

  const invRefInvestor = db.collection(col.investors).doc(investorId);
  const invSnap = await invRefInvestor.get();
  if (!invSnap.exists) return NextResponse.json({ error: "Investor not found" }, { status: 404 });
  if ((invSnap.get("organizationId") as string) !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = Date.now();
  const action = parsed.data.action;

  if (action === "mark_warm") {
    await invRefInvestor.set({ warmCold: "warm", updatedAt: now }, { merge: true });
    await insertActivity(db, {
      organizationId: ctx.orgId,
      investorId,
      type: "warmth_updated",
      summary: "Marked warm (from data room)",
      actorId: ctx.user.uid,
    });
    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.user.uid,
      action: "investor.patch_from_invitation",
      resource: `${col.investors}/${investorId}`,
      payload: { invitationId: id, patch: "mark_warm" },
    });
  } else if (action === "move_docs_sent" || action === "move_committed") {
    const nextStage: PipelineStage =
      action === "move_docs_sent" ? "data_room_opened" : "committed";
    PipelineStageSchema.parse(nextStage);
    const prevStage = invSnap.get("pipelineStage") as PipelineStage;
    if (prevStage !== nextStage) {
      await invRefInvestor.set({ pipelineStage: nextStage, updatedAt: now }, { merge: true });
      await insertActivity(db, {
        organizationId: ctx.orgId,
        investorId,
        type: "pipeline_stage_changed",
        summary: `Stage: ${stageLabel(prevStage)} → ${stageLabel(nextStage)} (data room)`,
        actorId: ctx.user.uid,
        metadata: { fromStage: prevStage, toStage: nextStage },
      });
    }
    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.user.uid,
      action: "investor.patch_from_invitation",
      resource: `${col.investors}/${investorId}`,
      payload: { invitationId: id, patch: action },
    });
  } else if (action === "assign_owner") {
    const ownerM = await getMembership(ctx.orgId, parsed.data.ownerUserId);
    if (!ownerM || isInvestorGuestRole(ownerM.role)) {
      return NextResponse.json(
        { error: "Owner must be a team member on this organization." },
        { status: 400 },
      );
    }
    const prevOwner = invSnap.get("relationshipOwnerUserId") as string | undefined;
    await invRefInvestor.set(
      { relationshipOwnerUserId: parsed.data.ownerUserId, updatedAt: now },
      { merge: true },
    );
    await insertActivity(db, {
      organizationId: ctx.orgId,
      investorId,
      type: "relationship_owner_updated",
      summary: `Relationship owner updated (data room)`,
      actorId: ctx.user.uid,
      metadata: { fromOwner: prevOwner ?? null, toOwner: parsed.data.ownerUserId },
    });
    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.user.uid,
      action: "investor.patch_from_invitation",
      resource: `${col.investors}/${investorId}`,
      payload: { invitationId: id, patch: "assign_owner" },
    });
  }

  revalidatePath("/investors");
  revalidatePath("/data-room");
  revalidatePath(`/investors/${investorId}`);
  return NextResponse.json({ ok: true, investorId });
}
