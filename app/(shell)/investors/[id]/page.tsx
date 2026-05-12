import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getInvestor,
  getMembership,
  listActivitiesForInvestor,
  listDeals,
  listOrganizationMembers,
  type OrganizationMemberPublic,
} from "@/lib/firestore/queries";
import { InvestorDetailClient } from "@/components/investor-detail-client";
import { redirect, notFound } from "next/navigation";

export default async function InvestorDetailPage(props: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");

  const { id } = await props.params;
  const [investor, membership, deals, members] = await Promise.all([
    getInvestor(ctx.orgId, id),
    getMembership(ctx.orgId, ctx.user.uid),
    listDeals(ctx.orgId),
    listOrganizationMembers(ctx.orgId),
  ]);

  if (!investor) notFound();

  redirectInvestorGuestsFromRaiseTools(membership?.role);

  const activities = await listActivitiesForInvestor(ctx.orgId, id, 80);
  const canManage = membership != null && canEditOrgData(membership.role);

  let membersForSelect: OrganizationMemberPublic[] = members;
  const ownerUid = investor.relationshipOwnerUserId?.trim();
  if (ownerUid && !members.some((m) => m.userId === ownerUid)) {
    try {
      const u = await getAdminAuth().getUser(ownerUid);
      const extra: OrganizationMemberPublic = {
        userId: ownerUid,
        role: "assistant",
        email: u.email ?? undefined,
        displayName: u.displayName ?? undefined,
      };
      membersForSelect = [...members, extra];
    } catch {
      membersForSelect = [...members, { userId: ownerUid, role: "assistant" }];
    }
  }

  return (
    <InvestorDetailClient
      investor={investor}
      activities={activities}
      canManage={canManage}
      deals={deals.map((d) => ({ id: d.id, name: d.name }))}
      members={membersForSelect}
    />
  );
}
