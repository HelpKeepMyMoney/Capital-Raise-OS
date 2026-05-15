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
  getOrganization,
  getQuestionnaireSigningRequest,
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
import { computeProgressPct, fmtUsd } from "@/lib/deals/format";
import { hasWhyInvestNarrativeOnDeal } from "@/lib/deals/why-invest-narrative";
import { isLikelyPdfDeck, pickPitchDeckDocument } from "@/lib/deals/pitch-deck-picker";
import { DealDetailShell } from "@/components/deals/deal-detail-shell";
import { DealTitleHero } from "@/components/deals/deal-title-hero";
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
import { DealPitchDeckViewer } from "@/components/deals/deal-pitch-deck-viewer";
import { DealYoutubeSection } from "@/components/deals/deal-youtube-section";
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

function firstSearchParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function DealDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ view?: string | string[] }>;
}) {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const { id } = await props.params;
  const query = props.searchParams ? await props.searchParams : {};
  const viewParam = firstSearchParam(query.view);

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
  const investorPreview = canManage && !guest && viewParam === "investor";

  if (!memberCanAccessDeal(membership, id)) notFound();

  const target = deal.targetRaise ?? 0;
  const pct = computeProgressPct(raised, target);
  const displayProgressPct = target > 0 ? pct : raised > 0 ? 100 : 0;

  const rawCommitments = await listDealCommitmentsForDeal(ctx.orgId, id);
  const activeCommitments = rawCommitments.filter((c) => c.status === "active");
  const investorCount = activeCommitments.length;

  let lastCommitMs: number | null = null;
  let lastCommitAmount: number | null = null;
  for (const c of activeCommitments) {
    if (lastCommitMs == null || c.updatedAt > lastCommitMs) {
      lastCommitMs = c.updatedAt;
      lastCommitAmount = c.amount;
    }
  }

  let commitmentRows: (DealCommitment & { contactEmail?: string })[] = [];
  if (canManage) {
    commitmentRows = await commitmentsWithEmails(activeCommitments);
  }

  let questionnaireTemplateConfigured = false;
  if (guest || canManage) {
    const org = await getOrganization(ctx.orgId);
    questionnaireTemplateConfigured = Boolean(org?.investorQuestionnaireSignableTemplateId?.trim());
  }

  let myCommitment: DealCommitment | null = null;
  let signingRow: SigningRequest | null = null;
  let questionnaireSigningRow: SigningRequest | null = null;
  if (guest) {
    myCommitment = await getDealCommitmentForUser(ctx.orgId, id, ctx.user.uid);
    signingRow = await getSigningRequest(ctx.orgId, id, ctx.user.uid);
    questionnaireSigningRow = await getQuestionnaireSigningRequest(ctx.orgId, id, ctx.user.uid);
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

  const MS_DAY = 86400000;
  const weekAgo = Date.now() - 7 * MS_DAY;
  let newDocsThisWeek = 0;
  for (const doc of roomDocs) {
    const t = doc.createdAt ?? 0;
    if (t >= weekAgo) newDocsThisWeek += 1;
  }

  let daysRemaining: number | null = null;
  const closeDate = deal.closeDate;
  if (typeof closeDate === "number" && closeDate > Date.now()) {
    daysRemaining = Math.ceil((closeDate - Date.now()) / MS_DAY);
  }

  const momentumHints: string[] = [];
  if (lastCommitAmount != null && lastCommitAmount > 0 && lastCommitAgo) {
    momentumHints.push(`${fmtUsd(lastCommitAmount)} committed ${lastCommitAgo}`);
  }
  if (pct > 0) {
    momentumHints.push(`${pct.toFixed(pct < 1 ? 2 : 0)}% funded`);
  }
  if (daysRemaining != null && daysRemaining >= 0) {
    momentumHints.push(`${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`);
  }
  if (newDocsThisWeek > 0) {
    momentumHints.push(
      `${newDocsThisWeek} doc${newDocsThisWeek === 1 ? "" : "s"} updated this week`,
    );
  }

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

  const pitchDeckDoc = pickPitchDeckDocument(roomDocs);

  const subscriptionCompleted = signingRow?.status === "completed";
  const questionnaireCompleted = questionnaireSigningRow?.status === "completed";
  const subscriptionSigningUrl =
    guest &&
    signingRow &&
    signingRow.status !== "completed" &&
    !signingRow.awaitingSponsorPrep &&
    typeof signingRow.signingUrl === "string" &&
    signingRow.signingUrl.trim().length > 0
      ? signingRow.signingUrl.trim()
      : undefined;
  const subscriptionSponsorSigningNext = Boolean(guest && signingRow?.sponsorTurnAfterLpSigned);

  return (
    <DealDetailShell
      dealId={deal.id}
      dealName={deal.name}
      guest={guest}
      progressPct={displayProgressPct}
      showBookCall={showBookCallCta}
      calendarBookingUrl={deal.calendarBookingUrl}
      subscriptionCompleted={subscriptionCompleted}
      subscriptionSigningUrl={subscriptionSigningUrl}
      subscriptionSponsorSigningNext={subscriptionSponsorSigningNext}
      questionnaireCompleted={questionnaireCompleted}
      questionnaireEnabled={guest && questionnaireTemplateConfigured}
    >
      <div className="mx-auto max-w-4xl space-y-12 px-4 pb-20 pt-6 md:px-6">
        <Link
          href="/deals"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit px-0 text-muted-foreground")}
        >
          ← Deal room
        </Link>

        {investorPreview ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Investor view</p>
              <p className="text-sm text-foreground/90">
                Preview what invited investors see on this deal room. Sponsor tools are hidden.
              </p>
            </div>
            <Link
              href={`/deals/${deal.id}`}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "shrink-0 self-start rounded-xl shadow-sm sm:self-center",
              )}
            >
              Back to sponsor view
            </Link>
          </div>
        ) : null}

        {canManage && !investorPreview ? (
          <DealManagerPanel
            deal={deal}
            analytics={analyticsPayload}
            commitments={commitmentRows}
            linkedDataRooms={linkedDataRoomSummaries}
          />
        ) : null}

        <div id="deal-hero-anchor">
          <DealTitleHero
            deal={deal}
            raised={raised}
            target={target}
            pct={pct}
            investorCount={investorCount}
            avgCheck={avgCheck}
            guest={guest}
            investorPreview={investorPreview}
            hasDataRoom={hasDataRoom}
            showDataRoomCta={showDataRoomCta}
            daysRemaining={daysRemaining}
            momentumHints={momentumHints}
            displayProgressPct={displayProgressPct}
            subscriptionCompleted={subscriptionCompleted}
            subscriptionSigningUrl={subscriptionSigningUrl}
            subscriptionSponsorSigningNext={subscriptionSponsorSigningNext}
            questionnaireCompleted={questionnaireCompleted}
            questionnaireEnabled={(guest || investorPreview) && questionnaireTemplateConfigured}
          />
        </div>

        {deal.youtubeOverviewUrl?.trim() ? (
          <DealYoutubeSection url={deal.youtubeOverviewUrl} />
        ) : null}

        {pitchDeckDoc ? (
          <DealPitchDeckViewer
            dealId={deal.id}
            documentId={pitchDeckDoc.id}
            documentName={pitchDeckDoc.name}
            isLikelyPdf={isLikelyPdfDeck(pitchDeckDoc)}
          />
        ) : null}

        <WhyInvest deal={deal} />

        <TractionSection metrics={deal.tractionMetrics} hideWhenEmpty={guest || investorPreview} />

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

        <DealDocuments
          dealId={deal.id}
          documents={roomDocs}
          faqHref={
            hasDataRoom
              ? `/data-room?deal=${encodeURIComponent(deal.id)}#faq`
              : "#faq"
          }
          hideWhenNoDocuments={guest || investorPreview}
        />

        {deal.investorUpdates && deal.investorUpdates.length > 0 ? (
          <Card className="rounded-2xl border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Recent updates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Published by the sponsor for investors following this offering.
              </p>
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

        <FaqSection
          items={deal.faqs}
          diligenceRoomFaqHref={
            hasDataRoom ? `/data-room?deal=${encodeURIComponent(deal.id)}#faq` : undefined
          }
        />

        {guest ? (
          <>
            <DealGuestSigning
              dealId={deal.id}
              orgId={ctx.orgId}
              userId={ctx.user.uid}
              initial={signingRow}
              initialQuestionnaire={questionnaireSigningRow}
              questionnaireConfigured={questionnaireTemplateConfigured}
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
                  initialCommitment={myCommitment}
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

        {!guest &&
        !hasWhyInvestNarrativeOnDeal(deal) &&
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
