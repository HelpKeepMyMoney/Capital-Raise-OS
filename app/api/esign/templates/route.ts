import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { SignableTemplate } from "@/lib/firestore/types";
import { getMembership } from "@/lib/firestore/queries";

export async function GET() {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getAdminFirestore();
  const snap = await db
    .collection(col.signableTemplates)
    .where("organizationId", "==", ctx.orgId)
    .limit(200)
    .get();

  const templates = snap.docs
    .map((d) => {
      const x = d.data() as SignableTemplate;
      if (x.archived) return null;
      return {
        id: d.id,
        name: x.name,
        storagePath: x.storagePath,
        fieldCount: Array.isArray(x.esignFields) ? x.esignFields.length : 0,
        updatedAt: x.updatedAt,
        createdAt: x.createdAt,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = typeof (body as { name?: string }).name === "string" ? (body as { name: string }).name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const id = randomUUID();
  const now = Date.now();
  const db = getAdminFirestore();
  const storagePath = `orgs/${ctx.orgId}/esign/templates/${id}/source.pdf`;

  const row: SignableTemplate = {
    id,
    organizationId: ctx.orgId,
    name: name.slice(0, 200),
    storagePath,
    esignFields: [],
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(col.signableTemplates).doc(id).set(row);

  return NextResponse.json({ id, name: row.name, storagePath });
}
