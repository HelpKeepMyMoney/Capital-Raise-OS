import Link from "next/link";
import { memberCanAccessDeal } from "@/lib/auth/investor-access";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getDeal,
  getDealCommitmentForUser,
  getMembership,
  listDealCommitmentsForDeal,
} from "@/lib/firestore/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpressInterestButton } from "@/components/express-interest-button";
import { DealCommitmentForm } from "@/components/deal-commitment-form";
import { InviteInvestorPanel } from "@/components/invite-investor-panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import type { DealCommitment } from "@/lib/firestore/types";

async function commitmentsWithEmails(
  rows: DealCommitment[],
): Promise<(DealCommitment & { contactEmail?: string })[]> {
  const auth = getAdminAuth();
  const out: (DealCommitment & { contactEmail?: string })[] = [];
  for (const c of rows) {
    try {
      const u = await auth.getUser(c.userId);
      out.push({ ...c, contactEmail: u.email ?? undefined });
    } catch {
      out.push({ ...c, contactEmail: undefined });
    }
  }
  return out;
}

export default async function DealDetailPage(props: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const { id } = await props.params;

  const [deal, membership] = await Promise.all([
    getDeal(ctx.orgId, id),
    getMembership(ctx.orgId, ctx.user.uid),
  ]);
  if (!deal) notFound();

  const canManage = membership != null && canEditOrgData(membership.role);
  const guest = membership?.role === "investor_guest";

  if (!memberCanAccessDeal(membership, id)) notFound();

  let commitmentRows: (DealCommitment & { contactEmail?: string })[] = [];
  if (canManage) {
    const raw = await listDealCommitmentsForDeal(ctx.orgId, id);
    commitmentRows = await commitmentsWithEmails(raw.filter((c) => c.status === "active"));
  }

  let myCommitmentAmt: number | undefined;
  if (guest) {
    const mine = await getDealCommitmentForUser(ctx.orgId, id, ctx.user.uid);
    myCommitmentAmt = mine?.status === "active" ? mine.amount : undefined;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-2">
        <Link href="/deals" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit px-0")}>
          ← Back to deal room
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{deal.name}</h1>
            <p className="mt-1 text-sm capitalize text-foreground/85">
              {deal.type.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {deal.status}
            </Badge>
            {guest ? (
              <>
                <ExpressInterestButton dealId={deal.id} dealName={deal.name} />
              </>
            ) : null}
          </div>
        </div>
      </div>

      {guest ? (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Investment interest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DealCommitmentForm
              dealId={deal.id}
              dealName={deal.name}
              initialAmount={myCommitmentAmt}
            />
          </CardContent>
        </Card>
      ) : null}

      {canManage ? (
        <div className="space-y-4">
          <InviteInvestorPanel dealId={deal.id} />

          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recorded commitments</CardTitle>
            </CardHeader>
            <CardContent>
              {commitmentRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active commitments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="pb-2 pr-4 font-medium">Investor</th>
                        <th className="pb-2 pr-4 font-medium">Amount (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commitmentRows.map((c) => (
                        <tr key={c.userId} className="border-t border-border">
                          <td className="py-2 pr-4">{c.contactEmail ?? c.userId.slice(0, 10)}</td>
                          <td className="py-2">${c.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {deal.targetRaise != null ? (
            <p>
              <span className="text-muted-foreground">Target raise: </span>
              ${(deal.targetRaise / 1_000_000).toFixed(1)}M
            </p>
          ) : null}
          {deal.minimumInvestment != null ? (
            <p>
              <span className="text-muted-foreground">Minimum: </span>$
              {(deal.minimumInvestment / 1000).toFixed(0)}K
            </p>
          ) : null}
          {deal.valuation != null ? (
            <p>
              <span className="text-muted-foreground">Valuation: </span>$
              {(deal.valuation / 1_000_000).toFixed(1)}M
            </p>
          ) : null}
          {deal.closeDate != null ? (
            <p>
              <span className="text-muted-foreground">Target close: </span>
              {new Date(deal.closeDate).toLocaleDateString()}
            </p>
          ) : null}
          {deal.terms ? (
            <div>
              <p className="text-muted-foreground">Terms</p>
              <p className="mt-1 whitespace-pre-wrap">{deal.terms}</p>
            </div>
          ) : null}
          {deal.useOfProceeds ? (
            <div>
              <p className="text-muted-foreground">Use of proceeds</p>
              <p className="mt-1 whitespace-pre-wrap">{deal.useOfProceeds}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
