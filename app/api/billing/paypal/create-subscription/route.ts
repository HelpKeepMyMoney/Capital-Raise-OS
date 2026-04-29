import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/auth/session";
import { paypalFetch } from "@/lib/paypal/client";
import { getPayPalPlanId, type PublicPlanId } from "@/lib/billing/plans";
import { canManageBilling, roleFromClaims } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = roleFromClaims(ctx.user.orgs as Record<string, string> | undefined, ctx.orgId);
  if (!role || !canManageBilling(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { plan } = (await req.json()) as { plan?: PublicPlanId };
  if (!plan || !getPayPalPlanId(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const planId = getPayPalPlanId(plan)!;
  const res = await paypalFetch("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      custom_id: ctx.orgId,
      application_context: {
        brand_name: "CPIN Capital Management System",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?status=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?status=cancel`,
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    return NextResponse.json({ error: t }, { status: 502 });
  }
  const json = (await res.json()) as { id?: string; links?: { href: string; rel: string }[] };
  const approve = json.links?.find((l) => l.rel === "approve")?.href;
  return NextResponse.json({ subscriptionId: json.id, approveUrl: approve });
}
