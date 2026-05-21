import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getMembership, getOrganization } from "@/lib/firestore/queries";
import { canUseAiCopilot, effectivePlan } from "@/lib/billing/features";
import { PersonalizePreviewSchema } from "@/lib/outreach/schemas";
import {
  generatePersonalizedOutreach,
  loadPersonalizeContext,
} from "@/lib/outreach/ai-personalization";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await getOrganization(ctx.orgId);
  const plan = effectivePlan(org?.subscription?.plan);
  if (!canUseAiCopilot(plan)) {
    return NextResponse.json(
      { error: "AI personalization requires Pro or higher." },
      { status: 402 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = checkRateLimit(rateLimitKey(ip, "outreach-ai"), 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PersonalizePreviewSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getAdminFirestore();
  const { investor, deal, recentActivitySummaries } = await loadPersonalizeContext(
    db,
    ctx.orgId,
    parsed.data.investorId,
    parsed.data.dealId,
  );

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const result = await generatePersonalizedOutreach({
    investor,
    organization: org,
    deal,
    subjectTemplate: parsed.data.subjectTemplate,
    bodyTemplate: parsed.data.bodyTemplate,
    recentActivitySummaries,
  });

  return NextResponse.json(result);
}
