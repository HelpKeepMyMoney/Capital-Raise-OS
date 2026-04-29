"use server";

import { randomUUID } from "crypto";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldPath } from "firebase-admin/firestore";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import {
  InvestorInteractionTypeSchema,
  InvestorTypeSchema,
  PipelineStageSchema,
  WarmColdSchema,
  type InvestorType,
  type PipelineStage,
  type Task,
  type WarmCold,
} from "@/lib/firestore/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buildInvestorFullName,
  investorDisplayNameFromFields,
} from "@/lib/investors/display-name";

function stageLabel(s: PipelineStage): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function requireInvestorEditor() {
  const ctx = await requireOrgSession();
  if (!ctx) throw new Error("Unauthorized");
  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) throw new Error("Forbidden");
  return ctx;
}

function revalidateInvestorSurfaces(investorId?: string) {
  revalidatePath("/investors");
  if (investorId) revalidatePath(`/investors/${investorId}`);
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/tasks");
}

/** Keeps a single open task in sync with the investor "Next follow-up" datetime. */
async function syncInvestorFollowUpTask(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  investorId: string,
  snap: FirebaseFirestore.DocumentSnapshot,
  nextFollowUpAt: number | null,
  investorDisplayName: string,
): Promise<string | null> {
  const existingTaskId = snap.get("followUpTaskId") as string | undefined;
  const title = `Follow up: ${investorDisplayName}`;

  if (nextFollowUpAt == null) {
    if (existingTaskId) {
      const tref = db.collection(col.tasks).doc(existingTaskId);
      const tsnap = await tref.get();
      if (tsnap.exists) {
        const t = tsnap.data() as Task;
        if (
          t.organizationId === orgId &&
          t.linkedInvestorId === investorId &&
          t.status === "open"
        ) {
          await tref.update({ status: "cancelled" });
        }
      }
    }
    return null;
  }

  if (existingTaskId) {
    const tref = db.collection(col.tasks).doc(existingTaskId);
    const tsnap = await tref.get();
    if (tsnap.exists) {
      const t = tsnap.data() as Task;
      if (
        t.organizationId === orgId &&
        t.linkedInvestorId === investorId &&
        t.status === "open"
      ) {
        await tref.update({
          dueAt: nextFollowUpAt,
          title,
          isInvestorFollowUp: true,
        });
        return existingTaskId;
      }
    }
  }

  const id = randomUUID();
  const now = Date.now();
  await db.collection(col.tasks).doc(id).set({
    id,
    organizationId: orgId,
    title,
    status: "open",
    dueAt: nextFollowUpAt,
    linkedInvestorId: investorId,
    isInvestorFollowUp: true,
    createdAt: now,
  });
  return id;
}

async function assertInvestorInOrg(
  db: FirebaseFirestore.Firestore,
  investorId: string,
  orgId: string,
) {
  const ref = db.collection(col.investors).doc(investorId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  if ((snap.get("organizationId") as string) !== orgId) throw new Error("Forbidden");
  return { ref, snap };
}

async function insertActivity(
  db: FirebaseFirestore.Firestore,
  input: {
    organizationId: string;
    investorId?: string;
    type: string;
    summary: string;
    actorId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const id = randomUUID();
  const now = Date.now();
  const doc: Record<string, unknown> = {
    id,
    organizationId: input.organizationId,
    type: input.type,
    summary: input.summary,
    createdAt: now,
  };
  if (input.investorId !== undefined) doc.investorId = input.investorId;
  if (input.actorId !== undefined) doc.actorId = input.actorId;
  if (input.metadata !== undefined) doc.metadata = input.metadata;
  await db.collection(col.activities).doc(id).set(doc);
}

const CreateInvestorSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional(),
  firm: z.string().trim().optional(),
  title: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  linkedIn: z.string().trim().optional(),
  location: z.string().trim().optional(),
  investorType: InvestorTypeSchema.optional(),
  pipelineStage: PipelineStageSchema.optional(),
  warmCold: WarmColdSchema.optional(),
  checkSizeMin: z.number().nonnegative().optional(),
  checkSizeMax: z.number().nonnegative().optional(),
  notesSummary: z.string().trim().optional(),
  relationshipScore: z.number().min(0).max(100).optional(),
  nextFollowUpAt: z.number().optional().nullable(),
  committedAmount: z.number().nonnegative().optional(),
  investProbability: z.number().min(0).max(100).optional(),
  referralSource: z.string().trim().optional(),
  interestedDealIds: z.array(z.string()).optional(),
  relationshipOwnerUserId: z.string().trim().optional(),
});

const UpdateInvestorSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().nullable().optional(),
  firm: z.string().trim().nullable().optional(),
  title: z.string().trim().nullable().optional(),
  email: z
    .union([z.string().trim().email(), z.literal(""), z.null()])
    .optional(),
  phone: z.string().trim().nullable().optional(),
  website: z.string().trim().nullable().optional(),
  linkedIn: z.string().trim().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  investorType: InvestorTypeSchema.optional().nullable(),
  pipelineStage: PipelineStageSchema.optional(),
  warmCold: WarmColdSchema.optional().nullable(),
  checkSizeMin: z.number().nonnegative().optional().nullable(),
  checkSizeMax: z.number().nonnegative().optional().nullable(),
  notesSummary: z.string().trim().optional().nullable(),
  relationshipScore: z.number().min(0).max(100).optional().nullable(),
  lastContactAt: z.number().optional().nullable(),
  nextFollowUpAt: z.number().optional().nullable(),
  committedAmount: z.number().optional().nullable(),
  investProbability: z.number().min(0).max(100).optional().nullable(),
  referralSource: z.string().trim().optional().nullable(),
  interestedDealIds: z.array(z.string()).optional().nullable(),
  relationshipOwnerUserId: z.string().trim().optional().nullable(),
});

export async function createInvestor(raw: z.infer<typeof CreateInvestorSchema>) {
  const ctx = await requireInvestorEditor();
  const parsed = CreateInvestorSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = getAdminFirestore();
  const now = Date.now();
  const ref = db.collection(col.investors).doc();
  const pipelineStage = parsed.data.pipelineStage ?? "lead";
  const email =
    parsed.data.email === "" || parsed.data.email === undefined
      ? undefined
      : parsed.data.email;

  const firstName = parsed.data.firstName;
  const lastName = parsed.data.lastName?.trim() || "";
  const name = buildInvestorFullName(firstName, lastName);
  const d = parsed.data;

  const doc: Record<string, unknown> = {
    organizationId: ctx.orgId,
    firstName,
    lastName: lastName || null,
    name,
    pipelineStage,
    crmStatus: "active",
    createdAt: now,
    updatedAt: now,
  };
  if (d.firm?.trim()) doc.firm = d.firm.trim();
  if (d.title?.trim()) doc.title = d.title.trim();
  if (email) doc.email = email;
  if (d.phone?.trim()) doc.phone = d.phone.trim();
  if (d.website?.trim()) doc.website = d.website.trim();
  if (d.linkedIn?.trim()) doc.linkedIn = d.linkedIn.trim();
  if (d.location?.trim()) doc.location = d.location.trim();
  if (d.investorType !== undefined) doc.investorType = d.investorType;
  if (d.warmCold !== undefined) doc.warmCold = d.warmCold;
  if (d.checkSizeMin !== undefined) doc.checkSizeMin = d.checkSizeMin;
  if (d.checkSizeMax !== undefined) doc.checkSizeMax = d.checkSizeMax;
  if (d.notesSummary?.trim()) doc.notesSummary = d.notesSummary.trim();
  if (d.relationshipScore !== undefined) doc.relationshipScore = d.relationshipScore;
  if (d.nextFollowUpAt !== undefined && d.nextFollowUpAt !== null) {
    doc.nextFollowUpAt = d.nextFollowUpAt;
  }
  if (d.committedAmount !== undefined) doc.committedAmount = d.committedAmount;
  if (d.investProbability !== undefined) doc.investProbability = d.investProbability;
  if (d.referralSource?.trim()) doc.referralSource = d.referralSource.trim();
  if (d.interestedDealIds?.length) doc.interestedDealIds = d.interestedDealIds;
  if (d.relationshipOwnerUserId?.trim()) doc.relationshipOwnerUserId = d.relationshipOwnerUserId.trim();

  await ref.set(doc);

  if (d.nextFollowUpAt != null) {
    const invSnap = await ref.get();
    const fid = await syncInvestorFollowUpTask(
      db,
      ctx.orgId,
      ref.id,
      invSnap,
      d.nextFollowUpAt,
      name,
    );
    if (fid) {
      await ref.update({ followUpTaskId: fid, updatedAt: Date.now() });
    }
  }

  await insertActivity(db, {
    organizationId: ctx.orgId,
    investorId: ref.id,
    type: "investor_created",
    summary: `Added ${name} to pipeline (${stageLabel(pipelineStage)})`,
    actorId: ctx.user.uid,
  });

  revalidateInvestorSurfaces(ref.id);
  return ref.id;
}

export async function updateInvestor(
  investorId: string,
  raw: z.infer<typeof UpdateInvestorSchema>,
) {
  const ctx = await requireInvestorEditor();
  const parsed = UpdateInvestorSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = getAdminFirestore();
  const { ref, snap } = await assertInvestorInOrg(db, investorId, ctx.orgId);

  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  const data = parsed.data;
  patch.firstName = data.firstName;
  patch.lastName = data.lastName?.trim() ? data.lastName.trim() : null;
  patch.name = buildInvestorFullName(data.firstName, data.lastName);
  if (data.firm !== undefined) patch.firm = data.firm || null;
  if (data.title !== undefined) patch.title = data.title || null;
  if (data.email !== undefined) patch.email = data.email === "" ? null : data.email;
  if (data.phone !== undefined) patch.phone = data.phone || null;
  if (data.website !== undefined) patch.website = data.website || null;
  if (data.linkedIn !== undefined) patch.linkedIn = data.linkedIn || null;
  if (data.location !== undefined) patch.location = data.location || null;
  if (data.investorType !== undefined) patch.investorType = data.investorType;
  if (data.warmCold !== undefined) patch.warmCold = data.warmCold;
  if (data.checkSizeMin !== undefined) patch.checkSizeMin = data.checkSizeMin;
  if (data.checkSizeMax !== undefined) patch.checkSizeMax = data.checkSizeMax;
  if (data.notesSummary !== undefined) patch.notesSummary = data.notesSummary;
  if (data.relationshipScore !== undefined) patch.relationshipScore = data.relationshipScore;
  if (data.lastContactAt !== undefined) patch.lastContactAt = data.lastContactAt;
  if (data.nextFollowUpAt !== undefined) patch.nextFollowUpAt = data.nextFollowUpAt;
  if (data.committedAmount !== undefined) patch.committedAmount = data.committedAmount;
  if (data.investProbability !== undefined) patch.investProbability = data.investProbability;
  if (data.referralSource !== undefined) patch.referralSource = data.referralSource || null;
  if (data.interestedDealIds !== undefined)
    patch.interestedDealIds = data.interestedDealIds?.length ? data.interestedDealIds : null;
  if (data.relationshipOwnerUserId !== undefined)
    patch.relationshipOwnerUserId = data.relationshipOwnerUserId || null;

  if (data.nextFollowUpAt !== undefined) {
    const displayName = buildInvestorFullName(data.firstName, data.lastName);
    const fid = await syncInvestorFollowUpTask(
      db,
      ctx.orgId,
      investorId,
      snap,
      data.nextFollowUpAt,
      displayName,
    );
    patch.followUpTaskId = fid;
  }

  const prevStage = snap.get("pipelineStage") as PipelineStage | undefined;
  if (data.pipelineStage !== undefined && data.pipelineStage !== prevStage) {
    patch.pipelineStage = data.pipelineStage;
  }

  await ref.update(patch);

  const effectiveFollowUpId =
    patch.followUpTaskId !== undefined
      ? (patch.followUpTaskId as string | null) || undefined
      : (snap.get("followUpTaskId") as string | undefined);
  if (
    effectiveFollowUpId &&
    (data.firstName !== undefined || data.lastName !== undefined)
  ) {
    const title = `Follow up: ${buildInvestorFullName(data.firstName, data.lastName)}`;
    const tref = db.collection(col.tasks).doc(effectiveFollowUpId);
    const tsnap = await tref.get();
    if (tsnap.exists) {
      const t = tsnap.data() as Task;
      if (
        t.organizationId === ctx.orgId &&
        t.linkedInvestorId === investorId &&
        t.status === "open"
      ) {
        await tref.update({ title });
      }
    }
  }

  if (data.pipelineStage !== undefined && data.pipelineStage !== prevStage && prevStage) {
    await insertActivity(db, {
      organizationId: ctx.orgId,
      investorId,
      type: "pipeline_stage_changed",
      summary: `Stage: ${stageLabel(prevStage)} → ${stageLabel(data.pipelineStage)}`,
      actorId: ctx.user.uid,
      metadata: { fromStage: prevStage, toStage: data.pipelineStage },
    });
  }

  revalidateInvestorSurfaces(investorId);
}

export async function updateInvestorStage(investorId: string, pipelineStage: PipelineStage) {
  const ctx = await requireInvestorEditor();
  PipelineStageSchema.parse(pipelineStage);
  const db = getAdminFirestore();
  const { ref, snap } = await assertInvestorInOrg(db, investorId, ctx.orgId);
  const prevStage = snap.get("pipelineStage") as PipelineStage;
  if (prevStage === pipelineStage) return;

  const now = Date.now();
  await ref.update({ pipelineStage, updatedAt: now });

  await insertActivity(db, {
    organizationId: ctx.orgId,
    investorId,
    type: "pipeline_stage_changed",
    summary: `Stage: ${stageLabel(prevStage)} → ${stageLabel(pipelineStage)}`,
    actorId: ctx.user.uid,
    metadata: { fromStage: prevStage, toStage: pipelineStage },
  });

  revalidateInvestorSurfaces(investorId);
}

export async function setInvestorArchived(investorId: string, archived: boolean) {
  const ctx = await requireInvestorEditor();
  const db = getAdminFirestore();
  const { ref, snap } = await assertInvestorInOrg(db, investorId, ctx.orgId);
  const d = snap.data() as {
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  const display = investorDisplayNameFromFields(d);
  const now = Date.now();

  if (archived) {
    await ref.update({
      crmStatus: "archived",
      archivedAt: now,
      updatedAt: now,
    });
    await insertActivity(db, {
      organizationId: ctx.orgId,
      investorId,
      type: "investor_archived",
      summary: `Archived ${display}`,
      actorId: ctx.user.uid,
    });
  } else {
    await ref.update({
      crmStatus: "active",
      archivedAt: null,
      updatedAt: now,
    });
    await insertActivity(db, {
      organizationId: ctx.orgId,
      investorId,
      type: "investor_restored",
      summary: `Restored ${display} to pipeline`,
      actorId: ctx.user.uid,
    });
  }

  revalidateInvestorSurfaces(investorId);
}

export async function deleteInvestor(investorId: string) {
  const ctx = await requireInvestorEditor();
  const db = getAdminFirestore();
  const { ref, snap } = await assertInvestorInOrg(db, investorId, ctx.orgId);

  const followUpTaskId = snap.get("followUpTaskId") as string | undefined;
  if (followUpTaskId) {
    const tref = db.collection(col.tasks).doc(followUpTaskId);
    const tsnap = await tref.get();
    if (tsnap.exists) {
      const t = tsnap.data() as Task;
      if (t.organizationId === ctx.orgId && t.linkedInvestorId === investorId) {
        await tref.delete();
      }
    }
  }

  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let q = db
      .collection(col.activities)
      .where("organizationId", "==", ctx.orgId)
      .where("investorId", "==", investorId)
      .orderBy(FieldPath.documentId())
      .limit(400);
    if (lastDoc) q = q.startAfter(lastDoc);
    const actSnap = await q.get();
    if (actSnap.empty) break;
    const batch = db.batch();
    for (const d of actSnap.docs) {
      batch.delete(d.ref);
    }
    await batch.commit();
    lastDoc = actSnap.docs[actSnap.docs.length - 1];
    if (actSnap.size < 400) break;
  }

  await ref.delete();

  revalidateInvestorSurfaces();
}

const LogInteractionSchema = z.object({
  investorId: z.string().min(1),
  interactionType: InvestorInteractionTypeSchema,
  summary: z.string().trim().min(1, "Summary is required"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function logInvestorInteraction(raw: z.infer<typeof LogInteractionSchema>) {
  const ctx = await requireInvestorEditor();
  const parsed = LogInteractionSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = getAdminFirestore();
  await assertInvestorInOrg(db, parsed.data.investorId, ctx.orgId);

  await insertActivity(db, {
    organizationId: ctx.orgId,
    investorId: parsed.data.investorId,
    type: parsed.data.interactionType,
    summary: parsed.data.summary,
    actorId: ctx.user.uid,
    metadata: parsed.data.metadata,
  });

  const now = Date.now();
  await db.collection(col.investors).doc(parsed.data.investorId).update({
    lastContactAt: now,
    updatedAt: now,
  });

  revalidateInvestorSurfaces(parsed.data.investorId);
}

async function assertActivityForInvestorTimeline(
  db: FirebaseFirestore.Firestore,
  activityId: string,
  orgId: string,
  investorId: string,
) {
  const ref = db.collection(col.activities).doc(activityId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const data = snap.data() as {
    organizationId?: string;
    investorId?: string;
    type?: string;
    summary?: string;
  };
  if (data.organizationId !== orgId) throw new Error("Forbidden");
  if (data.investorId !== investorId) throw new Error("Forbidden");
  return { ref, snap, data };
}

const UpdateTimelineActivitySchema = z.object({
  summary: z.string().trim().min(1, "Summary is required"),
  interactionType: InvestorInteractionTypeSchema.optional(),
});

export async function updateInvestorTimelineActivity(
  investorId: string,
  activityId: string,
  raw: z.infer<typeof UpdateTimelineActivitySchema>,
) {
  const ctx = await requireInvestorEditor();
  const parsed = UpdateTimelineActivitySchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

  const db = getAdminFirestore();
  await assertInvestorInOrg(db, investorId, ctx.orgId);
  const { ref, data } = await assertActivityForInvestorTimeline(db, activityId, ctx.orgId, investorId);

  const patch: Record<string, unknown> = { summary: parsed.data.summary };
  if (parsed.data.interactionType !== undefined) {
    const parsedCurrent = InvestorInteractionTypeSchema.safeParse(data.type);
    if (!parsedCurrent.success) {
      throw new Error("Only call, email, meeting, note, or other can change type");
    }
    patch.type = parsed.data.interactionType;
  }

  await ref.update(patch);
  revalidateInvestorSurfaces(investorId);
}

export async function deleteInvestorTimelineActivity(investorId: string, activityId: string) {
  const ctx = await requireInvestorEditor();
  const db = getAdminFirestore();
  await assertInvestorInOrg(db, investorId, ctx.orgId);
  const { ref } = await assertActivityForInvestorTimeline(db, activityId, ctx.orgId, investorId);
  await ref.delete();
  revalidateInvestorSurfaces(investorId);
}
