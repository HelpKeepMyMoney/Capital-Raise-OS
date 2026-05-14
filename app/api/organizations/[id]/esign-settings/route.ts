import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canEditOrganizationProfileRole } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership, getOrganization } from "@/lib/firestore/queries";

const BodySchema = z
  .object({
    subscriptionSignableTemplateId: z.string().uuid().nullable().optional(),
    investorQuestionnaireSignableTemplateId: z.string().uuid().nullable().optional(),
  })
  .strict();

async function assertTemplateInOrg(orgId: string, templateId: string): Promise<NextResponse | null> {
  const t = await getAdminFirestore().collection(col.signableTemplates).doc(templateId).get();
  if (!t.exists) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  const row = t.data() as { organizationId?: string };
  if (row.organizationId !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orgId } = await ctx.params;
  if (orgId !== session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrganizationProfileRole(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await getOrganization(orgId);
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = parsed.data;
  if (
    data.subscriptionSignableTemplateId === undefined &&
    data.investorQuestionnaireSignableTemplateId === undefined
  ) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};

  if (data.subscriptionSignableTemplateId !== undefined) {
    const id = data.subscriptionSignableTemplateId;
    if (id) {
      const err = await assertTemplateInOrg(orgId, id);
      if (err) return err;
    }
    updates.subscriptionSignableTemplateId = id;
  }

  if (data.investorQuestionnaireSignableTemplateId !== undefined) {
    const id = data.investorQuestionnaireSignableTemplateId;
    if (id) {
      const err = await assertTemplateInOrg(orgId, id);
      if (err) return err;
    }
    updates.investorQuestionnaireSignableTemplateId = id;
  }

  const db = getAdminFirestore();
  await db.collection(col.organizations).doc(orgId).set(updates, { merge: true });

  return NextResponse.json({
    ok: true,
    ...(data.subscriptionSignableTemplateId !== undefined
      ? { subscriptionSignableTemplateId: data.subscriptionSignableTemplateId ?? null }
      : {}),
    ...(data.investorQuestionnaireSignableTemplateId !== undefined
      ? { investorQuestionnaireSignableTemplateId: data.investorQuestionnaireSignableTemplateId ?? null }
      : {}),
  });
}
