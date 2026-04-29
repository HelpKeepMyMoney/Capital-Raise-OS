import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col, taskCommentsSubcollection } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import type { Task } from "@/lib/firestore/types";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: taskId } = await context.params;
  const db = getAdminFirestore();
  const taskSnap = await db.collection(col.tasks).doc(taskId).get();
  if (!taskSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const task = taskSnap.data() as Task;
  if (task.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snap = await db
    .collection(col.tasks)
    .doc(taskId)
    .collection(taskCommentsSubcollection)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const comments = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));

  return NextResponse.json({ comments });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: taskId } = await context.params;
  const body = (await req.json()) as { body?: string };
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Comment body is required" }, { status: 400 });

  const db = getAdminFirestore();
  const taskSnap = await db.collection(col.tasks).doc(taskId).get();
  if (!taskSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const task = taskSnap.data() as Task;
  if (task.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const commentId = randomUUID();
  const now = Date.now();
  const doc = {
    id: commentId,
    taskId,
    organizationId: ctx.orgId,
    authorId: ctx.user.uid,
    body: text,
    createdAt: now,
  };

  await db
    .collection(col.tasks)
    .doc(taskId)
    .collection(taskCommentsSubcollection)
    .doc(commentId)
    .set(doc);

  return NextResponse.json(doc);
}
