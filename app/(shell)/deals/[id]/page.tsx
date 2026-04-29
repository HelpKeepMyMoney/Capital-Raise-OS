import Link from "next/link";
import { memberCanAccessDeal } from "@/lib/auth/investor-access";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getDeal,
  getDealCommitmentForUser,
  getMembership,
  getSigningRequest,
  listDealCommitmentsForDeal,
  sumActiveCommitmentsForDeal,
} from "@/lib/firestore/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ExpressInterestButton } from "@/components/express-interest-button";
import { DealCommitmentForm } from "@/components/deal-commitment-form";
import { DealGuestSigning } from "@/components/deal-guest-signing";
import { InviteInvestorPanel } from "@/components/invite-investor-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import type { DealCommitment, SigningRequest } from "@/lib/firestore/types";
import { Calendar, Download, FileText, Phone, Wallet } from "lucide-react";

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

function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export default async function DealDetailPage(props: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const { id } = await props.params;

  const [deal, membership, raised] = await Promise.all([
    getDeal(ctx.orgId, id),
    getMembership(ctx.orgId, ctx.user.uid),
    sumActiveCommitmentsForDeal(ctx.orgId, id),
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
  let signingRow: SigningRequest | null = null;
  if (guest) {
    const mine = await getDealCommitmentForUser(ctx.orgId, id, ctx.user.uid);
    myCommitmentAmt = mine?.status === "active" ? mine.amount : undefined;
    signingRow = await getSigningRequest(ctx.orgId, id, ctx.user.uid);
  }

  const target = deal.targetRaise ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : raised > 0 ? 100 : 0;

  let daysRemaining: number | null = null;
  if (deal.closeDate != null) {
    daysRemaining = Math.ceil((deal.closeDate - Date.now()) / 86400000);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link
        href="/deals"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit px-0 text-muted-foreground")}
      >
        ← Deal room
      </Link>

      <Card className="overflow-hidden rounded-2xl border-border/80 bg-card shadow-lg">
        <div className="border-b border-border/70 bg-muted/30 px-6 py-6 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Offering
              </p>
              <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
                {deal.name}
              </h1>
              <p className="mt-1.5 text-sm capitalize text-muted-foreground">
                {deal.type.replace(/_/g, " ")} · <span className="capitalize">{deal.status}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-lg capitalize">
                {deal.status}
              </Badge>
              {guest ? <ExpressInterestButton dealId={deal.id} dealName={deal.name} /> : null}
            </div>
          </div>

          {target > 0 ? (
            <div className="mt-6 space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {fmtUsd(raised)} raised
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    of {fmtUsd(target)} target
                  </span>
                </span>
                <span className="text-muted-foreground">{pct}% subscribed</span>
              </div>
              <Progress value={pct} className="h-2.5 rounded-full" />
            </div>
          ) : raised > 0 ? (
            <p className="mt-4 text-sm font-medium">{fmtUsd(raised)} committed to date</p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {guest ? (
              <Link href="#commit" className={cn(buttonVariants(), "rounded-xl gap-2")}>
                <Wallet className="size-4" />
                Commit capital
              </Link>
            ) : null}
            {deal.calendarBookingUrl ? (
              <a
                href={deal.calendarBookingUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline" }), "rounded-xl gap-2")}
              >
                <Calendar className="size-4" />
                Book a call
              </a>
            ) : null}
            <Link href="/data-room" className={cn(buttonVariants({ variant: "outline" }), "rounded-xl gap-2")}>
              <Download className="size-4" />
              Data room
            </Link>
            {guest && deal.calendarBookingUrl === undefined ? (
              <Button variant="ghost" className="rounded-xl gap-2 text-muted-foreground" disabled>
                <Phone className="size-4" />
                Book a call
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {deal.minimumInvestment != null ? (
              <span>Min {fmtUsd(deal.minimumInvestment)}</span>
            ) : null}
            {daysRemaining != null ? (
              <span className={daysRemaining <= 7 ? "font-medium text-destructive" : ""}>
                {daysRemaining < 0
                  ? `Closed ${Math.abs(daysRemaining)}d ago`
                  : `${daysRemaining} days remaining`}
              </span>
            ) : null}
            {deal.closeDate != null ? (
              <span>Target close {new Date(deal.closeDate).toLocaleDateString()}</span>
            ) : null}
          </div>
        </div>
      </Card>

      {deal.executiveSummary ? (
        <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-md md:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <FileText className="size-4" />
            Executive summary
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {deal.executiveSummary}
          </p>
        </section>
      ) : null}

      {deal.sponsorProfile ? (
        <Card className="rounded-2xl border-border/80 shadow-md">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Sponsor profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{deal.sponsorProfile}</p>
          </CardContent>
        </Card>
      ) : null}

      {(deal.useOfProceeds || deal.returnsModel) && (
        <div className="grid gap-6 md:grid-cols-2">
          {deal.useOfProceeds ? (
            <Card className="rounded-2xl border-border/80 shadow-md">
              <CardHeader>
                <CardTitle className="font-heading text-base">Use of funds</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{deal.useOfProceeds}</p>
              </CardContent>
            </Card>
          ) : null}
          {deal.returnsModel ? (
            <Card className="rounded-2xl border-border/80 shadow-md">
              <CardHeader>
                <CardTitle className="font-heading text-base">Returns model</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{deal.returnsModel}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {deal.terms || deal.valuation != null ? (
        <Card className="rounded-2xl border-border/80 shadow-md">
          <CardHeader>
            <CardTitle className="font-heading text-base">Economics &amp; terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {deal.valuation != null ? (
              <p>
                <span className="text-muted-foreground">Valuation: </span>
                {fmtUsd(deal.valuation)}
              </p>
            ) : null}
            {deal.terms ? <p className="whitespace-pre-wrap">{deal.terms}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {deal.faqs && deal.faqs.length > 0 ? (
        <Card className="rounded-2xl border-border/80 shadow-md">
          <CardHeader>
            <CardTitle className="font-heading text-lg">FAQs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deal.faqs.map((f, i) => (
              <div key={i} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                <p className="font-medium text-foreground">{f.q}</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{f.a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {deal.investorUpdates && deal.investorUpdates.length > 0 ? (
        <Card className="rounded-2xl border-border/80 shadow-md">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Investor updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {deal.investorUpdates
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((u, i) => (
                <div key={i}>
                  <p className="text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                  <p className="font-medium">{u.title}</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{u.body}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      ) : null}

      {guest ? (
        <>
          <DealGuestSigning
            dealId={deal.id}
            orgId={ctx.orgId}
            userId={ctx.user.uid}
            initial={signingRow}
          />
          <Card id="commit" className="rounded-2xl border-border/80 shadow-md">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Reserve commitment</CardTitle>
              <p className="text-sm text-muted-foreground">
                Formalize interest; the sponsor team will confirm allocation and subscription docs.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <DealCommitmentForm
                dealId={deal.id}
                dealName={deal.name}
                initialAmount={myCommitmentAmt}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {canManage ? (
        <div className="space-y-4">
          <InviteInvestorPanel dealId={deal.id} />

          <Card className="rounded-2xl border-border/80 shadow-md">
            <CardHeader>
              <CardTitle className="font-heading text-base">Recorded commitments</CardTitle>
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

      {!deal.executiveSummary &&
      !deal.sponsorProfile &&
      !deal.faqs?.length &&
      !deal.investorUpdates?.length ? (
        <p className="text-center text-sm text-muted-foreground">
          Extended offering narrative can be added by your team in Firestore or future deal editor.
        </p>
      ) : null}
    </div>
  );
}
