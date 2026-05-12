import Link from "next/link";
import { filterDealsForMember } from "@/lib/auth/investor-access";
import { isInvestorGuestRole } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership, getSigningRequest, listDeals } from "@/lib/firestore/queries";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2, FileSignature, Mail, Shield } from "lucide-react";

export default async function PortalHomePage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  if (!membership || !isInvestorGuestRole(membership.role)) redirect("/dashboard");

  const deals = filterDealsForMember(await listDeals(ctx.orgId), membership);

  const subscriptionRows = await Promise.all(
    deals.map(async (d) => ({
      deal: d,
      signing: await getSigningRequest(ctx.orgId, d.id, ctx.user.uid),
    })),
  );
  const completedSubs = subscriptionRows.filter((r) => r.signing?.status === "completed");
  const inFlightSubs = subscriptionRows.filter(
    (r) => r.signing && r.signing.status !== "completed",
  );

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/40 p-8 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Shield className="size-7" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">LP portal</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              A secure workspace for your active offerings, commitments, and subscription workflow.
              Built for institutional trust — encryption in transit, sponsor-controlled documents, and a
              clear audit trail.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/portal/commitments" className={cn(buttonVariants(), "rounded-xl gap-2")}>
            <Building2 className="size-4" />
            My commitments
          </Link>
          <Link
            href="/data-room"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-xl gap-2")}
          >
            Data room &amp; uploads
          </Link>
          <a
            href={`mailto:${ctx.user.email ?? ""}?subject=Question%20from%20LP%20portal`}
            className={cn(buttonVariants({ variant: "secondary" }), "rounded-xl gap-2")}
          >
            <Mail className="size-4" />
            Message sponsor
          </a>
        </div>
      </div>

      <section>
        <h2 className="font-heading text-lg font-semibold">Your active deals</h2>
        <ul className="mt-4 space-y-3">
          {deals.length === 0 ? (
            <li className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No offerings linked to your invitation yet.
            </li>
          ) : (
            deals.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/deals/${d.id}`}
                  className="flex items-center justify-between rounded-2xl border border-border/80 bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {d.status} · {d.type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg")}>
                    View
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-border/80 bg-muted/20 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileSignature className="size-4" />
          Subscription documents (e-sign)
        </div>
        {completedSubs.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {completedSubs.map(({ deal }) => (
              <li
                key={deal.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm"
              >
                <span className="font-medium">{deal.name}</span>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                    Signed
                  </span>
                  <Link
                    href={`/api/esign/subscription/final-document?dealId=${encodeURIComponent(deal.id)}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg")}
                  >
                    Download signed PDF
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {inFlightSubs.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {inFlightSubs.map(({ deal, signing }) => (
              <li
                key={deal.id}
                className="rounded-xl border border-dashed border-border/80 bg-background/50 px-4 py-3 text-sm text-muted-foreground"
              >
                <span className="font-medium text-foreground">{deal.name}</span>
                {" · "}
                {signing?.awaitingSponsorPrep
                  ? "Awaiting sponsor signature"
                  : signing?.signingUrl
                    ? "Ready for your signature — open the deal page"
                    : "Subscription packet in progress"}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-4 text-sm text-muted-foreground">
          Request subscription documents on each deal page. When fully signed, the finished PDF is emailed to you and
          your sponsor (when email is configured). You can also download from here,{" "}
          <Link href="/portal/commitments" className="font-medium text-primary underline-offset-4 hover:underline">
            My commitments
          </Link>
          , or the deal page.
        </p>
      </section>
    </div>
  );
}
