import Link from "next/link";
import { filterDealsForMember } from "@/lib/auth/investor-access";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership, listDeals } from "@/lib/firestore/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ExpressInterestButton } from "@/components/express-interest-button";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function DealsPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const [allDeals, membership] = await Promise.all([
    listDeals(ctx.orgId),
    getMembership(ctx.orgId, ctx.user.uid),
  ]);
  const deals = filterDealsForMember(allDeals, membership);
  const canManage = membership != null && canEditOrgData(membership.role);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Deal room</h1>
          <p className="mt-1 text-foreground/85">
            Offerings: equity, SAFE, convertible, syndication, LP fund, revenue share, private bond.
          </p>
        </div>
        {canManage ? (
          <Link
            href="/deals/new"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
          >
            New offering
          </Link>
        ) : null}
      </div>
      <div className="grid gap-4">
        {deals.map((d) => (
          <Card key={d.id} className="border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg">
                <Link href={`/deals/${d.id}`} className="hover:underline">
                  {d.name}
                </Link>
              </CardTitle>
              <Badge variant="secondary" className="shrink-0 capitalize">
                {d.status}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-sm">
              <div className="space-y-1 text-muted-foreground">
                <p className="capitalize text-foreground font-medium">{d.type.replace(/_/g, " ")}</p>
                {d.targetRaise != null ? <p>Target raise: ${(d.targetRaise / 1_000_000).toFixed(1)}M</p> : null}
                {d.minimumInvestment != null ? (
                  <p>Min: ${(d.minimumInvestment / 1000).toFixed(0)}K</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/deals/${d.id}`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  View details
                </Link>
                {membership?.role === "investor_guest" ? (
                  <ExpressInterestButton dealId={d.id} dealName={d.name} />
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {deals.length === 0 ? (
          <p className="text-sm text-foreground/80">
            No offerings yet
            {canManage ? (
              <>
                {" "}
                —{" "}
                <Link href="/deals/new" className="text-foreground underline underline-offset-4">
                  create one
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
