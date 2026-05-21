import { NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/auth/session";
import { listInvestors } from "@/lib/firestore/queries";
import { investorDisplayName } from "@/lib/investors/display-name";
import { isInvestorActive } from "@/lib/investors/investor-kpis";

export async function GET() {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const investors = await listInvestors(ctx.orgId, { limit: 500 });
  const options = investors
    .filter(isInvestorActive)
    .map((inv) => ({
      id: inv.id,
      name: investorDisplayName(inv),
      email: inv.email?.trim() || undefined,
      firm: inv.firm?.trim() || undefined,
    }));

  return NextResponse.json({ investors: options });
}
