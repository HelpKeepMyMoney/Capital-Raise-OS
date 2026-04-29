import Link from "next/link";
import { filterDealsForMember } from "@/lib/auth/investor-access";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import {
  countInvestorsInterestedInDeal,
  getMembership,
  listDeals,
  listInvestors,
  sumActiveCommitmentsForDeal,
} from "@/lib/firestore/queries";
import { DealRoomHeader } from "@/components/deals/deal-room-header";
import { DealCard } from "@/components/deals/deal-card";
import { ExpressInterestButton } from "@/components/express-interest-button";
import { redirect } from "next/navigation";

export default async function DealsPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const [allDeals, membership, investors] = await Promise.all([
    listDeals(ctx.orgId),
    getMembership(ctx.orgId, ctx.user.uid),
    listInvestors(ctx.orgId),
  ]);
  const deals = filterDealsForMember(allDeals, membership);
  const canManage = membership != null && canEditOrgData(membership.role);
  const guest = membership?.role === "investor_guest";

  const raisedList = await Promise.all(
    deals.map((d) => sumActiveCommitmentsForDeal(ctx.orgId, d.id)),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-8 md:px-6">
      <DealRoomHeader canManage={canManage} />
      <div className="grid gap-5">
        {deals.map((d, i) => (
          <DealCard
            key={d.id}
            deal={d}
            metrics={{
              raised: raisedList[i] ?? 0,
              interestCount: countInvestorsInterestedInDeal(investors, d.id),
            }}
            canManage={canManage}
            showExpressInterest={guest}
            expressInterestSlot={<ExpressInterestButton dealId={d.id} dealName={d.name} />}
          />
        ))}
        {deals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card/80 px-6 py-12 text-center text-sm text-muted-foreground">
            No offerings yet
            {canManage ? (
              <>
                {" "}
                —{" "}
                <Link href="/deals/new" className="font-medium text-foreground underline underline-offset-4">
                  Create one
                </Link>{" "}
                or seed demo data.
              </>
            ) : (
              "."
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
