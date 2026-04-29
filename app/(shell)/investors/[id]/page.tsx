import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getInvestor, getMembership, listActivitiesForInvestor } from "@/lib/firestore/queries";
import { InvestorDetailClient } from "@/components/investor-detail-client";
import { redirect, notFound } from "next/navigation";

export default async function InvestorDetailPage(props: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");

  const { id } = await props.params;
  const [investor, membership] = await Promise.all([
    getInvestor(ctx.orgId, id),
    getMembership(ctx.orgId, ctx.user.uid),
  ]);

  if (!investor) notFound();

  redirectInvestorGuestsFromRaiseTools(membership?.role);

  const activities = await listActivitiesForInvestor(ctx.orgId, id, 80);
  const canManage = membership != null && canEditOrgData(membership.role);

  return <InvestorDetailClient investor={investor} activities={activities} canManage={canManage} />;
}
