import { NextRequest } from "next/server";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { ApiOrganizationPatchSchema } from "@/lib/organizations/patch-organization";
import { v1BadRequest, v1Error, v1Json, v1NotFound } from "@/lib/api/v1/responses";
import { serializeOrganization } from "@/lib/api/v1/serialize";
import { buildOrgPipelineSummary } from "@/lib/api/v1/org-summary";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { stripUndefinedDeep } from "@/lib/object/strip-undefined-deep";
import { getOrganization } from "@/lib/firestore/queries";

export async function GET(req: NextRequest) {
  return withApiKeyAuth(req, async (ctx) => {
    const [org, summary] = await Promise.all([
      getOrganization(ctx.orgId),
      buildOrgPipelineSummary(ctx.orgId),
    ]);
    return v1Json({
      organization: org
        ? serializeOrganization(org)
        : { id: ctx.orgId, name: null, slug: null, contact: null, createdAt: null },
      pipeline: summary,
    });
  });
}

export async function PATCH(req: NextRequest) {
  return withApiKeyAuth(req, async (ctx) => {
    const org = await getOrganization(ctx.orgId);
    if (!org) return v1NotFound("Organization");

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return v1BadRequest("Invalid JSON body");
    }

    const parsed = ApiOrganizationPatchSchema.safeParse(raw);
    if (!parsed.success) {
      return v1BadRequest("Invalid body", parsed.error.flatten());
    }

    const { name, slug, contact } = parsed.data;
    if (name === undefined && slug === undefined && contact === undefined) {
      return v1BadRequest("No changes");
    }

    const db = getAdminFirestore();
    if (slug !== undefined && slug !== org.slug) {
      const dup = await db.collection(col.organizations).where("slug", "==", slug).limit(2).get();
      const taken = dup.docs.some((d) => d.id !== ctx.orgId);
      if (taken) {
        return v1Error("conflict", "That slug is already in use", 409);
      }
    }

    const patch: Record<string, unknown> = {};
    const auditKeys: string[] = [];
    if (name !== undefined) {
      patch.name = name;
      auditKeys.push("name");
    }
    if (slug !== undefined) {
      patch.slug = slug;
      auditKeys.push("slug");
    }
    if (contact !== undefined) {
      patch.contact = stripUndefinedDeep(contact) as Record<string, unknown>;
      auditKeys.push("contact");
    }

    await db.collection(col.organizations).doc(ctx.orgId).update(patch);

    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.actorId,
      action: "organization.update.api",
      resource: `${col.organizations}/${ctx.orgId}`,
      payload: { keys: auditKeys },
    });

    const updated = await getOrganization(ctx.orgId);
    if (!updated) return v1NotFound("Organization");
    return v1Json({ organization: serializeOrganization(updated) });
  });
}
