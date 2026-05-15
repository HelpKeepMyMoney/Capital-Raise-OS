"use client";

import type { SerializedDataRoom, SerializedRoomDocument } from "@/components/data-room/types";
import { resolveDealFaqItems } from "@/components/deals/faq-section";
import type { Deal } from "@/lib/firestore/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { useMounted } from "@/hooks/use-mounted";
import { InvestorNdaRequestButton } from "@/components/data-room/investor-nda-request-button";
import { pickInvestorSpotlightDocuments } from "@/components/data-room/investor-spotlight-docs";

type Props = {
  room: SerializedDataRoom;
  deal: Deal | null | undefined;
  documentsForRoom: SerializedRoomDocument[];
  lastLoginAtMs: number | null;
  /** Lower bound for “recent” (computed on server so SSR and client agree). */
  activitySinceMs: number;
  onOpenDocuments: () => void;
};

type RecentRow =
  | { key: string; kind: "deal"; title: string; body: string; at: number }
  | { key: string; kind: "doc"; doc: SerializedRoomDocument; at: number };

function buildRecentRows(
  deal: Deal | null | undefined,
  docs: SerializedRoomDocument[],
  sinceMs: number,
): RecentRow[] {
  const rows: RecentRow[] = [];
  for (const u of deal?.investorUpdates ?? []) {
    if (typeof u.createdAt === "number" && u.createdAt > sinceMs) {
      rows.push({
        key: `u-${u.createdAt}-${u.title}`,
        kind: "deal",
        title: u.title,
        body: u.body,
        at: u.createdAt,
      });
    }
  }
  for (const d of docs) {
    if (d.kind === "folder") continue;
    const at = d.createdAt;
    if (typeof at === "number" && at > sinceMs) {
      rows.push({ key: `d-${d.id}`, kind: "doc", doc: d, at });
    }
  }
  rows.sort((a, b) => b.at - a.at);
  return rows;
}

export function InvestorPreview(props: Props) {
  const mounted = useMounted();
  const welcome = props.room.welcomeMessage?.trim()
    ? props.room.welcomeMessage
    : "Welcome to the diligence room. Review materials and reach out with diligence questions.";

  const keyDocs = React.useMemo(
    () => pickInvestorSpotlightDocuments(props.documentsForRoom),
    [props.documentsForRoom],
  );
  const hasAnyFiles = React.useMemo(
    () => props.documentsForRoom.some((d) => d.kind !== "folder"),
    [props.documentsForRoom],
  );

  const recentRows = React.useMemo(
    () => buildRecentRows(props.deal, props.documentsForRoom, props.activitySinceMs),
    [props.deal, props.documentsForRoom, props.activitySinceMs],
  );

  const faqs = resolveDealFaqItems(props.deal?.faqs);

  const loginUnavailable = props.lastLoginAtMs == null;
  const ndaLocked = Boolean(props.room.investorDocsLockedByNda);
  const investorStepAt = props.room.investorNdaInvestorStepCompletedAt;
  const investorNdaStepDoneAwaitingSponsor =
    typeof investorStepAt === "number" && !props.room.investorNdaSignedAt;

  return (
    <div className="space-y-4">
      {ndaLocked ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/40 bg-amber-50 px-5 py-4 text-sm text-amber-950 dark:border-amber-400/35 dark:bg-amber-950/40 dark:text-amber-50"
        >
          <p className="font-semibold">Mutual NDA required before you can open diligence files</p>
          <p className="mt-2 leading-relaxed text-amber-950/90 dark:text-amber-50/95">
            This room requires a mutual NDA. Use <span className="font-medium">the same email you use here</span> so
            your signature matches your account. After you sign, diligence materials unlock; the final PDF appears here
            once all parties have signed.
          </p>
          {typeof props.room.investorPendingNdaSigningUrl === "string" &&
          props.room.investorPendingNdaSigningUrl.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild className="rounded-lg">
                <a href={props.room.investorPendingNdaSigningUrl} target="_blank" rel="noopener noreferrer">
                  Open NDA signing
                </a>
              </Button>
            </div>
          ) : investorNdaStepDoneAwaitingSponsor ? (
            <p className="mt-4 text-sm font-medium text-amber-950 dark:text-amber-50">
              You&apos;ve completed your part of the mutual NDA. The sponsor is next to sign; once they finish, the
              envelope completes and the final PDF will be available here.
            </p>
          ) : props.room.investorNdaAwaitingSponsor ? (
            <p className="mt-4 text-sm font-medium text-amber-950 dark:text-amber-50">
              You don&apos;t have an active signing link in this browser yet. Check your email or refresh this page when
              it&apos;s your turn.
            </p>
          ) : props.room.investorNdaCanRequestSponsor ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <InvestorNdaRequestButton roomId={props.room.id} className="rounded-lg" />
              <p className="text-sm text-amber-950/90 dark:text-amber-50/95">
                We&apos;ll email your sponsor. Use the same email here as in their CRM so signing matches your account.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-amber-950/90 dark:text-amber-50/95">
              If you don&apos;t see <span className="font-medium">Open NDA signing</span>, the envelope may still be
              getting set up — your sponsor can send it from Data room → Settings, and your login email must match the
              one they use for you in CRM.
            </p>
          )}
        </div>
      ) : null}
      <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
        <div className="border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-8 py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Investor portal</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {props.deal?.name ?? props.room.name}
          </h3>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{welcome}</p>
        </div>
        <CardContent className="space-y-8 p-8">
          {props.room.ndaRequired ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-foreground">Mutual NDA</h4>
                {props.room.investorNdaSignedAt ? (
                  <Badge variant="secondary" className="rounded-full">
                    {mounted
                      ? `Signed ${new Date(props.room.investorNdaSignedAt).toLocaleDateString()}`
                      : "Signed"}
                  </Badge>
                ) : investorNdaStepDoneAwaitingSponsor ? (
                  <Badge variant="secondary" className="rounded-full">
                    Awaiting sponsor
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full">
                    Pending
                  </Badge>
                )}
              </div>
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
                {props.room.investorNdaSignedAt ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-muted-foreground">
                      Signed on{" "}
                      <span className="font-medium text-foreground">
                        {mounted ? new Date(props.room.investorNdaSignedAt).toLocaleString() : "—"}
                      </span>
                      .
                    </p>
                    <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <a href={`/api/esign/room-nda/final-document?roomId=${encodeURIComponent(props.room.id)}`}>
                        Download signed NDA
                      </a>
                    </Button>
                  </div>
                ) : investorNdaStepDoneAwaitingSponsor ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      You&apos;ve signed your part of the mutual NDA. The sponsor is next to sign. Diligence materials
                      unlock after your signing step; the final combined PDF appears here once every party has signed.
                    </p>
                    {mounted ? (
                      <p className="text-xs text-muted-foreground">
                        Your step completed {formatDistanceToNow(investorStepAt, { addSuffix: true })}.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-muted-foreground">
                      Sign the mutual NDA when your link is active. Diligence files unlock after you complete your
                      signing step; the final combined PDF appears once every party has signed.
                    </p>
                    {typeof props.room.investorPendingNdaSigningUrl === "string" &&
                    props.room.investorPendingNdaSigningUrl.length > 0 ? (
                      <Button asChild size="sm" className="inline-flex rounded-lg">
                        <a
                          href={props.room.investorPendingNdaSigningUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open NDA signing
                        </a>
                      </Button>
                    ) : props.room.investorNdaAwaitingSponsor ? (
                      <p className="text-sm text-muted-foreground">
                        No active signing link here yet. Check your email or refresh after others sign, if you&apos;re
                        waiting for a turn.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground">Key documents</h4>
              {!ndaLocked ? (
                <Button type="button" size="sm" className="rounded-lg" onClick={props.onOpenDocuments}>
                  View documents
                </Button>
              ) : null}
            </div>
            {ndaLocked ? (
              <p className="rounded-xl border border-dashed border-amber-500/35 bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                Files are locked until your NDA is completed.
              </p>
            ) : keyDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {!hasAnyFiles
                  ? "No documents in this room yet."
                  : "No pitch deck, PPM, term sheet, financial projections, or articles-style file matched yet. Use View documents for the full library."}
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {keyDocs.map(({ doc: d, label }) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <a
                      href={`/api/data-room/documents/${encodeURIComponent(d.id)}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 truncate font-medium text-primary hover:underline"
                    >
                      {d.name}
                    </a>
                    <Badge variant="secondary" className="shrink-0">
                      {label}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Recent updates</h4>
            {ndaLocked ? null : loginUnavailable ? (
              <p className="text-xs text-muted-foreground">
                Last sign-in time wasn&apos;t available; showing updates from roughly the last 90 days (including deal notes and new
                files).
              </p>
            ) : null}
            {ndaLocked ? (
              <p className="text-sm text-muted-foreground">
                Document activity is hidden until the NDA is complete.
              </p>
            ) : recentRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {loginUnavailable
                  ? "No deal notes or new uploads showed up in roughly the last 90 days. Use View documents for the full library."
                  : "No new deal notes or uploads since your last sign-in. Use View documents for the full library."}
              </p>
            ) : (
              <ul className="space-y-4">
                {recentRows.map((row) =>
                  row.kind === "deal" ? (
                    <li key={row.key} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{row.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {mounted ? formatDistanceToNow(row.at, { addSuffix: true }) : "—"}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{row.body}</p>
                    </li>
                  ) : (
                    <li key={row.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <span className="text-foreground">
                          New file:{" "}
                          <a
                            href={`/api/data-room/documents/${encodeURIComponent(row.doc.id)}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {row.doc.name}
                          </a>
                        </span>
                        <Badge variant="outline" className="ml-2 capitalize">
                          {row.doc.kind}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {mounted ? formatDistanceToNow(row.at, { addSuffix: true }) : "—"}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>

          <section id="faq" className="scroll-mt-28 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">FAQ</h4>
            {!props.room.dealId || !props.deal ? (
              <p className="text-sm text-muted-foreground">
                Link a deal in Settings to show diligence FAQs when they&apos;re configured on the deal record.
              </p>
            ) : (
              <div className="space-y-2">
                {faqs.map((f, i) => (
                  <details key={i} className="group rounded-xl border border-border px-4 py-2">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">{f.q}</summary>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            )}
          </section>

          <Separator />
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-xl">
              <Link href="mailto:">Contact sponsor</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link
                href={
                  props.deal?.calendarBookingUrl && props.deal.calendarBookingUrl.startsWith("http")
                    ? props.deal.calendarBookingUrl
                    : "#"
                }
              >
                Book a call
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
