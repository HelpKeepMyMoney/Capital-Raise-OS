"use server";

import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { PipelineStage } from "@/lib/firestore/types";
import { revalidatePath } from "next/cache";

export async function updateInvestorStage(investorId: string, pipelineStage: PipelineStage) {
  const ctx = await requireOrgSession();
  if (!ctx) throw new Error("Unauthorized");
  const db = getAdminFirestore();
  const ref = db.collection(col.investors).doc(investorId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  if ((snap.get("organizationId") as string) !== ctx.orgId) throw new Error("Forbidden");
  await ref.update({ pipelineStage, updatedAt: Date.now() });
  revalidatePath("/investors");
}
