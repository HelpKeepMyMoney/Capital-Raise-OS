import Link from "next/link";
import { isInvestorGuestRole } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getDeal, getMembership, listDealCommitmentsForUser } from "@/lib/firestore/queries";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function PortalCommitmentsPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  if (!membership || !isInvestorGuestRole(membership.role)) redirect("/dashboard");

  const rows = await listDealCommitmentsForUser(ctx.orgId, ctx.user.uid);
  const deals = await Promise.all(rows.map((r) => getDeal(ctx.orgId, r.dealId)));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/portal" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-0")}>
        ← Portal home
      </Link>
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">My commitments</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Amounts are shown in whole currency units as recorded by the sponsor.
        </p>
      </div>
      <ul className="space-y-3">
        {rows.length === 0 ? (
          <li className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No commitments recorded yet. Visit an offering to express interest or commit capital.
          </li>
        ) : (
          rows.map((r, i) => {
            const deal = deals[i];
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{deal?.name ?? "Offering"}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {r.status} · {r.currency}
                      {r.docStatus && r.docStatus !== "none"
                        ? ` · Docs: ${r.docStatus === "complete" ? "signed" : r.docStatus}`
                        : ""}
                    </p>
                  </div>
                  <p className="text-lg font-semibold tabular-nums">
                    ${r.amount.toLocaleString()}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/deals/${r.dealId}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg")}
                  >
                    Deal page
                  </Link>
                  {r.docStatus === "complete" ? (
                    <a
                      href={`/api/esign/subscription/final-document?dealId=${encodeURIComponent(r.dealId)}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg")}
                    >
                      Download signed PDF
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
