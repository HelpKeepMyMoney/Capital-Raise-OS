import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminBucket, getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { SignableTemplate } from "@/lib/firestore/types";
import { getMembership } from "@/lib/firestore/queries";
import { EsignFieldsSchema } from "@/lib/esign/template-schema";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const db = getAdminFirestore();
  const snap = await db.collection(col.signableTemplates).doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const t = snap.data() as SignableTemplate;
  if (t.organizationId !== session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (t.archived) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bucket = getAdminBucket();
  let hasSourcePdf = false;
  try {
    const [exists] = await bucket.file(t.storagePath).exists();
    hasSourcePdf = Boolean(exists);
  } catch {
    hasSourcePdf = false;
  }

  return NextResponse.json({
    id: snap.id,
    name: t.name,
    storagePath: t.storagePath,
    esignFields: t.esignFields ?? [],
    updatedAt: t.updatedAt,
    createdAt: t.createdAt,
    hasSourcePdf,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const db = getAdminFirestore();
  const ref = db.collection(col.signableTemplates).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const t = snap.data() as SignableTemplate;
  if (t.organizationId !== session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (t.archived) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (typeof (body as { name?: string }).name === "string") {
    updates.name = (body as { name: string }).name.trim().slice(0, 200);
  }
  if ("esignFields" in (body as object)) {
    const parsed = EsignFieldsSchema.safeParse((body as { esignFields: unknown }).esignFields);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid esignFields", details: parsed.error.flatten() }, { status: 400 });
    }
    updates.esignFields = parsed.data;
  }
  if (typeof (body as { archived?: boolean }).archived === "boolean") {
    updates.archived = (body as { archived: boolean }).archived;
  }

  await ref.set(updates, { merge: true });

  return NextResponse.json({ ok: true, id });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const db = getAdminFirestore();
  const snap = await db.collection(col.signableTemplates).doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const t = snap.data() as SignableTemplate;
  if (t.organizationId !== session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (t.archived) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const entry = form.get("file");
  if (entry == null || typeof entry === "string") {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const blob = entry as Blob;
  if (blob.size === 0) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (blob.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF too large (max 25MB)" }, { status: 400 });
  }
  const buf = Buffer.from(await blob.arrayBuffer());
  if (!buf.slice(0, 5).equals(Buffer.from("%PDF-"))) {
    return NextResponse.json({ error: "PDF file required" }, { status: 400 });
  }

  const bucket = getAdminBucket();
  try {
    await bucket.file(t.storagePath).save(buf, {
      contentType: "application/pdf",
      resumable: false,
    });
  } catch (e) {
    console.error("[esign template upload]", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Could not save PDF to storage. Check Firebase Storage credentials and bucket.",
      },
      { status: 500 },
    );
  }

  await db.collection(col.signableTemplates).doc(id).set({ updatedAt: Date.now() }, { merge: true });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const db = getAdminFirestore();
  const ref = db.collection(col.signableTemplates).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const t = snap.data() as SignableTemplate;
  if (t.organizationId !== session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (t.archived) return NextResponse.json({ ok: true, id });

  const now = Date.now();
  await ref.set({ archived: true, updatedAt: now }, { merge: true });

  const orgRef = db.collection(col.organizations).doc(session.orgId);
  const orgSnap = await orgRef.get();
  if (orgSnap.exists) {
    const org = orgSnap.data() as { subscriptionSignableTemplateId?: string | null };
    if (org.subscriptionSignableTemplateId === id) {
      await orgRef.set({ subscriptionSignableTemplateId: null }, { merge: true });
    }
  }

  const bucket = getAdminBucket();
  try {
    await bucket.file(t.storagePath).delete({ ignoreNotFound: true });
  } catch (e) {
    console.error("[esign template delete storage]", e);
  }

  return NextResponse.json({ ok: true, id });
}
