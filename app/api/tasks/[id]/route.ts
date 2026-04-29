import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";
import type { Task } from "@/lib/firestore/types";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as { status?: string };
  const status = body.status;
  if (status !== "open" && status !== "done" && status !== "cancelled") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getAdminFirestore();
  const ref = db.collection(col.tasks).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const task = snap.data() as Task;
  if (task.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ref.update({ status });

  if (task.linkedInvestorId && task.isInvestorFollowUp) {
    const invRef = db.collection(col.investors).doc(task.linkedInvestorId);
    const invSnap = await invRef.get();
    if (invSnap.exists) {
      const inv = invSnap.data() as { organizationId?: string; followUpTaskId?: string };
      if (inv.organizationId !== ctx.orgId) {
        // no-op
      } else if (status === "done" || status === "cancelled") {
        if (inv.followUpTaskId === id) {
          await invRef.update({
            nextFollowUpAt: null,
            followUpTaskId: null,
            updatedAt: Date.now(),
          });
          revalidatePath(`/investors/${task.linkedInvestorId}`);
        }
      } else if (status === "open" && task.dueAt != null) {
        await invRef.update({
          nextFollowUpAt: task.dueAt,
          followUpTaskId: id,
          updatedAt: Date.now(),
        });
        revalidatePath(`/investors/${task.linkedInvestorId}`);
      }
    }
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "task.update",
    resource: `${col.tasks}/${id}`,
    payload: { status },
  });

  return NextResponse.json({ ok: true, status });
}
