import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col, signingRequestDocId } from "@/lib/firestore/paths";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/firestore/queries";
import { isInvestorGuestRole } from "@/lib/auth/rbac";
import { memberCanAccessDeal } from "@/lib/auth/investor-access";
import { signwellRequest } from "@/lib/esign/signwell";
import { randomUUID } from "crypto";

function extractSigningUrl(data: {
  recipients?: Array<{ embedded_signing_url?: string | null; signing_url?: string | null }>;
}): string | undefined {
  const r = data.recipients?.[0];
  const u = r?.embedded_signing_url ?? r?.signing_url;
  return typeof u === "string" && u.length > 0 ? u : undefined;
}

/** Guest creates a SignWell document from the org’s subscription template (embedded signing). */
export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !isInvestorGuestRole(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as { dealId?: string };
  const dealId = typeof body.dealId === "string" ? body.dealId.trim() : "";
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });
  if (!memberCanAccessDeal(m, dealId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getAdminFirestore();
  const id = signingRequestDocId(ctx.orgId, dealId, ctx.user.uid);
  const now = Date.now();
  const ref = db.collection(col.signingRequests).doc(id);

  if (!process.env.SIGNWELL_API_KEY) {
    await ref.set(
      {
        id,
        organizationId: ctx.orgId,
        dealId,
        userId: ctx.user.uid,
        status: "draft" as const,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true },
    );
    return NextResponse.json({
      ok: true,
      mode: "stub",
      id,
      message: "Configure SIGNWELL_API_KEY to enable live signing.",
    });
  }

  const templateId = process.env.SIGNWELL_SUBSCRIPTION_TEMPLATE_ID?.trim();
  if (!templateId) {
    return NextResponse.json(
      {
        error:
          "Set SIGNWELL_SUBSCRIPTION_TEMPLATE_ID to your SignWell subscription template UUID (dashboard → Templates).",
      },
      { status: 400 },
    );
  }

  const placeholder =
    process.env.SIGNWELL_TEMPLATE_SIGNER_PLACEHOLDER?.trim() || "Signer";
  const email = ctx.user.email ?? "";
  const name = ctx.user.name?.trim() || email || "Investor";

  try {
    const res = await signwellRequest("/document_templates/documents/", {
      method: "POST",
      body: JSON.stringify({
        test_mode: process.env.SIGNWELL_TEST_MODE === "1",
        template_id: templateId,
        embedded_signing: true,
        name: `Subscription — ${dealId.slice(0, 8)}`,
        metadata: {
          organizationId: ctx.orgId,
          dealId,
          userId: ctx.user.uid,
        },
        recipients: [
          {
            id: "1",
            placeholder_name: placeholder,
            email: email || "investor@example.com",
            name,
          },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText || "SignWell error" }, { status: 502 });
    }
    const data = (await res.json()) as {
      id?: string;
      recipients?: Array<{ embedded_signing_url?: string | null; signing_url?: string | null }>;
    };
    const docId = data.id ?? randomUUID();
    const signingUrl = extractSigningUrl(data);
    await ref.set(
      {
        id,
        organizationId: ctx.orgId,
        dealId,
        userId: ctx.user.uid,
        signwellDocumentId: docId,
        status: "sent" as const,
        updatedAt: now,
        createdAt: now,
        ...(signingUrl ? { signingUrl } : {}),
      },
      { merge: true },
    );
    return NextResponse.json({
      ok: true,
      id,
      signwellDocumentId: docId,
      signingUrl: signingUrl ?? null,
      status: "sent",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "SignWell request failed" },
      { status: 500 },
    );
  }
}
