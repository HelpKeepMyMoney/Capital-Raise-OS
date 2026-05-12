import { randomUUID } from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { col } from "@/lib/firestore/paths";
import type { EsignEnvelope, EsignEnvelopeContext } from "@/lib/firestore/types";

function revalidateInvestorSurfaces(investorId: string) {
  revalidatePath("/investors");
  revalidatePath(`/investors/${investorId}`);
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/tasks");
}

function buildEsignSummary(ctx: EsignEnvelopeContext, label?: string): string {
  if (ctx.kind === "data_room_nda") {
    return "Completed data room NDA (e-sign)";
  }
  if (ctx.kind === "deal_subscription") {
    return "Completed subscription documents (e-sign)";
  }
  if (ctx.kind === "ad_hoc" && label?.trim()) {
    return `Completed “${label.trim()}” (e-sign)`;
  }
  return "Completed signed document (e-sign)";
}

/**
 * When an envelope fully executes, match the investor/LP email to a CRM row and record
 * a touch (lastContactAt + timeline) so “logged touchpoint” / AI insight reflect e-sign.
 */
export async function recordCrmTouchFromCompletedEnvelope(
  db: Firestore,
  env: EsignEnvelope,
  investorEmailNorm: string | null,
): Promise<void> {
  const orgId = env.organizationId;
  const norm = investorEmailNorm?.trim().toLowerCase() ?? "";
  if (!norm) return;

  const invId = await findInvestorIdByOrgAndEmailNorm(db, orgId, norm);
  if (!invId) return;

  const now = Date.now();
  const id = randomUUID();
  const ctx = env.context;
  const adHocLabel = ctx.kind === "ad_hoc" ? ctx.label : undefined;
  const summary = buildEsignSummary(ctx, adHocLabel);

  const act: Record<string, unknown> = {
    id,
    organizationId: orgId,
    investorId: invId,
    type: "other",
    summary,
    createdAt: now,
    metadata: {
      source: "esign",
      envelopeId: env.id,
      contextKind: ctx.kind,
    },
  };
  if (ctx.kind === "deal_subscription") act.dealId = ctx.dealId;

  const batch = db.batch();
  batch.set(db.collection(col.activities).doc(id), act);
  batch.update(db.collection(col.investors).doc(invId), { lastContactAt: now, updatedAt: now });
  await batch.commit();

  revalidateInvestorSurfaces(invId);
}

async function findInvestorIdByOrgAndEmailNorm(
  db: Firestore,
  orgId: string,
  emailNorm: string,
): Promise<string | null> {
  const q1 = await db
    .collection(col.investors)
    .where("organizationId", "==", orgId)
    .where("email", "==", emailNorm)
    .limit(2)
    .get();
  if (q1.size === 1) return q1.docs[0]!.id;
  if (q1.size > 1) return null;

  const snap = await db
    .collection(col.investors)
    .where("organizationId", "==", orgId)
    .limit(500)
    .get();
  let found: string | null = null;
  for (const d of snap.docs) {
    const em = (d.get("email") as string | undefined)?.trim().toLowerCase();
    if (em === emailNorm) {
      if (found) return null;
      found = d.id;
    }
  }
  return found;
}
