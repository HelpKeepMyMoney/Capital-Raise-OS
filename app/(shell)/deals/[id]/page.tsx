import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { memberCanAccessDeal } from "@/lib/auth/investor-access";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  countInvestorsInterestedInDeal,
  getDeal,
  getDealCommitmentForUser,
  getMembership,
  getSigningRequest,
  hasActiveDataRoomForDeal,
  listActiveDataRoomsForDeal,
  listDealCommitmentsForDeal,
  listDealTelemetryEvents,
  listDocumentsForDeal,
  listInvestorInvitationsForOrganization,
  listInvestors,
  sumActiveCommitmentsForDeal,
} from "@/lib/firestore/queries";
import { aggregateDealTelemetry } from "@/lib/deals/telemetry";
import { countActiveInvitesForDeal } from "@/lib/deals/invite-helpers";
import { computeProgressPct } from "@/lib/deals/format";
import { hasWhyInvestNarrativeOnDeal, pickWhyInvestNarrative } from "@/lib/deals/why-invest-narrative";
import { DealDetailShell } from "@/components/deals/deal-detail-shell";
import { DealTitleHero } from "@/components/deals/deal-title-hero";
import { RaiseProgress } from "@/components/deals/raise-progress";
import { WhyInvest } from "@/components/deals/why-invest";
import { TractionSection } from "@/components/deals/traction-section";
import { FounderCredibility } from "@/components/deals/founder-credibility";
import { UseOfFundsChart } from "@/components/deals/use-of-funds-chart";
import { TermsGrid } from "@/components/deals/terms-grid";
import { DealDocuments } from "@/components/deals/deal-documents";
import { FaqSection } from "@/components/deals/faq-section";
import { CommitCTA } from "@/components/deals/commit-cta";
import { SoftCommitChips } from "@/components/deals/soft-commit-chips";
import { DealManagerPanel } from "@/components/deals/deal-manager-panel";
import type { DealAnalyticsDTO } from "@/components/deals/deal-analytics";
import { DealCommitmentForm } from "@/components/deal-commitment-form";
import { DealGuestSigning } from "@/components/deal-guest-signing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import type { DealCommitment, SigningRequest } from "@/lib/firestore/types";
import { FileText } from "lucide-react";

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

  const [deal, membership, raised] = await Promise.all([
    getDeal(ctx.orgId, id),
    getMembership(ctx.orgId, ctx.user.uid),
    sumActiveCommitmentsForDeal(ctx.orgId, id),
  ]);
  if (!deal) notFound();

  const canManage = membership != null && canEditOrgData(membership.role);

  const [investors, hasDataRoom, roomDocs] = await Promise.all([
    canManage ? listInvestors(ctx.orgId) : Promise.resolve([]),
    hasActiveDataRoomForDeal(ctx.orgId, id),
    listDocumentsForDeal(ctx.orgId, id),
  ]);
  const guest = membership?.role === "investor_guest";

  if (!memberCanAccessDeal(membership, id)) notFound();

  const target = deal.targetRaise ?? 0;
  const pct = computeProgressPct(raised, target);

  let commitmentRows: (DealCommitment & { contactEmail?: string })[] = [];
  let investorCount = 0;
  let lastCommitMs: number | null = null;
  if (canManage) {
    const raw = await listDealCommitmentsForDeal(ctx.orgId, id);
    const active = raw.filter((c) => c.status === "active");
    commitmentRows = await commitmentsWithEmails(active);
    investorCount = active.length;
    for (const c of active) {
      if (lastCommitMs == null || c.updatedAt > lastCommitMs) lastCommitMs = c.updatedAt;
    }
  } else {
    const allForDeal = await listDealCommitmentsForDeal(ctx.orgId, id);
    const active = allForDeal.filter((c) => c.status === "active");
    investorCount = active.length;
    for (const c of active) {
      if (lastCommitMs == null || c.updatedAt > lastCommitMs) lastCommitMs = c.updatedAt;
    }
  }

  let myCommitmentAmt: number | undefined;
  let signingRow: SigningRequest | null = null;
  if (guest) {
    const mine = await getDealCommitmentForUser(ctx.orgId, id, ctx.user.uid);
    myCommitmentAmt = mine?.status === "active" ? mine.amount : undefined;
    signingRow = await getSigningRequest(ctx.orgId, id, ctx.user.uid);
  }

  const avgCheck = investorCount > 0 ? raised / investorCount : 0;
  const interestCount = countInvestorsInterestedInDeal(investors, id);

  let linkedDataRoomSummaries: { id: string; name: string }[] = [];
  if (canManage) {
    const linkedRooms = await listActiveDataRoomsForDeal(ctx.orgId, id);
    linkedDataRoomSummaries = linkedRooms.map((r) => ({ id: r.id, name: r.name }));
  }

  let telemetry: DealAnalyticsDTO["telemetry"] = {
    pageViews: 0,
    uniqueVisitors: 0,
    byEvent: [],
  };
  let activeInviteCount = 0;
  if (canManage) {
    const [telEvents, invites] = await Promise.all([
      listDealTelemetryEvents(ctx.orgId, id),
      listInvestorInvitationsForOrganization(ctx.orgId, 120),
    ]);
    telemetry = aggregateDealTelemetry(telEvents);
    activeInviteCount = countActiveInvitesForDeal(invites, id);
  }

  const lastCommitAgo =
    lastCommitMs != null
      ? formatDistanceToNow(lastCommitMs, { addSuffix: true })
      : null;

  const showDataRoomCta = hasDataRoom;

  const analyticsPayload: DealAnalyticsDTO = {
    interestCount,
    activeInviteCount,
    commitments: {
      count: investorCount,
      total: raised,
      avg: avgCheck,
    },
    telemetry,
  };

  const ctaVisibility = deal.cta;
  const showBookCallCta = ctaVisibility?.showBookCall !== false && Boolean(deal.calendarBookingUrl);

  return (
    <DealDetailShell dealId={deal.id} guest={guest}>
      <div className="mx-auto max-w-4xl space-y-12 px-4 pb-20 pt-6 md:px-6">
        <Link
          href="/deals"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit px-0 text-muted-foreground")}
        >
          ← Deal room
        </Link>

        <div id="deal-hero-anchor">
          <DealTitleHero
            deal={deal}
            raised={raised}
            target={target}
            pct={pct}
            investorCount={investorCount}
            avgCheck={avgCheck}
            guest={guest}
            hasDataRoom={hasDataRoom}
            showDataRoomCta={showDataRoomCta}
          />
        </div>

        {target > 0 || raised > 0 ? (
          <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:p-8">
            <RaiseProgress
              raised={raised}
              target={target > 0 ? target : raised}
              investorCount={investorCount}
              lastCommitAgo={lastCommitAgo}
            />
          </section>
        ) : null}

        <WhyInvest blocks={deal.whyInvest} narrative={pickWhyInvestNarrative(deal)} />

        <TractionSection metrics={deal.tractionMetrics} />

        <FounderCredibility founder={deal.founder} sponsorProfileFallback={deal.sponsorProfile} />

        <UseOfFundsChart split={deal.useOfFundsSplit} proseFallback={deal.useOfProceeds} />

        {deal.returnsModel?.trim() ? (
          <Card className="rounded-2xl border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <FileText className="size-4" />
                Returns model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{deal.returnsModel}</p>
            </CardContent>
          </Card>
        ) : null}

        <TermsGrid deal={deal} />

        <DealDocuments dealId={deal.id} documents={roomDocs} />

        {deal.investorUpdates && deal.investorUpdates.length > 0 ? (
          <Card className="rounded-2xl border-border/80 shadow-sm">
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
                    <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{u.body}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        ) : null}

        <FaqSection items={deal.faqs} />

        {guest ? (
          <>
            <DealGuestSigning
              dealId={deal.id}
              orgId={ctx.orgId}
              userId={ctx.user.uid}
              initial={signingRow}
            />
            <SoftCommitChips dealId={deal.id} dealName={deal.name} minAmount={deal.minimumInvestment} />
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

        {guest ? (
          <CommitCTA
            dealId={deal.id}
            showCommit
            commitHref="#commit"
            showBookCall={showBookCallCta}
            calendarUrl={deal.calendarBookingUrl}
            showDataRoom={showDataRoomCta && hasDataRoom}
            dataRoomHref={`/data-room?deal=${encodeURIComponent(deal.id)}`}
          />
        ) : null}

        {canManage ? (
          <DealManagerPanel
            deal={deal}
            analytics={analyticsPayload}
            commitments={commitmentRows}
            linkedDataRooms={linkedDataRoomSummaries}
          />
        ) : null}

        {!hasWhyInvestNarrativeOnDeal(deal) &&
        !deal.sponsorProfile &&
        !(deal.faqs && deal.faqs.length > 0) &&
        !deal.investorUpdates?.length ? (
          <p className="text-center text-sm text-muted-foreground">
            Extended offering narrative can be added by your team in Settings.
          </p>
        ) : null}
      </div>
    </DealDetailShell>
  );
}
