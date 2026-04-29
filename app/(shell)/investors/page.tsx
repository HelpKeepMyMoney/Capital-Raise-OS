import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership, listInvestors } from "@/lib/firestore/queries";
import { InvestorsBoard } from "@/components/investors-board";
import { redirect } from "next/navigation";

export default async function InvestorsPage(props: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");

  const sp = await props.searchParams;
  const includeArchived = sp.archived === "1";

  const [investors, membership] = await Promise.all([
    listInvestors(ctx.orgId, { includeArchived }),
    getMembership(ctx.orgId, ctx.user.uid),
  ]);
  redirectInvestorGuestsFromRaiseTools(membership?.role);
  const canManage = membership != null && canEditOrgData(membership.role);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Investor CRM</h1>
        <p className="mt-1 text-foreground/85">
          Pipeline intelligence with Kanban and spreadsheet views.
        </p>
      </div>
      <InvestorsBoard
        initial={investors}
        canManage={canManage}
        showArchived={includeArchived}
      />
    </div>
  );
}
