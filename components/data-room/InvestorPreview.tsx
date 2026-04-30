"use client";

import type { SerializedDataRoom, SerializedRoomDocument } from "@/components/data-room/types";
import { resolveDealFaqItems } from "@/components/deals/faq-section";
import type { Deal } from "@/lib/firestore/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as React from "react";
import { formatDistanceToNow } from "date-fns";

const KIND_ORDER: Record<SerializedRoomDocument["kind"], number> = {
  deck: 0,
  ppm: 1,
  legal: 2,
  model: 3,
  video: 4,
  other: 5,
};

function sortKeyDocuments(docs: SerializedRoomDocument[]) {
  return [...docs].sort((a, b) => {
    const ka = KIND_ORDER[a.kind] ?? 99;
    const kb = KIND_ORDER[b.kind] ?? 99;
    if (ka !== kb) return ka - kb;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

type Props = {
  room: SerializedDataRoom;
  deal: Deal | null | undefined;
  documentsForRoom: SerializedRoomDocument[];
  lastLoginAtMs: number | null;
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
    const at = d.createdAt;
    if (typeof at === "number" && at > sinceMs) {
      rows.push({ key: `d-${d.id}`, kind: "doc", doc: d, at });
    }
  }
  rows.sort((a, b) => b.at - a.at);
  return rows;
}

export function InvestorPreview(props: Props) {
  const welcome = props.room.welcomeMessage?.trim()
    ? props.room.welcomeMessage
    : "Welcome to the diligence room. Review materials and reach out with diligence questions.";

  const keyDocs = React.useMemo(() => sortKeyDocuments(props.documentsForRoom), [props.documentsForRoom]);

  const recentRows = React.useMemo(() => {
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const boundaryMs = props.lastLoginAtMs ?? Date.now() - ninetyDaysMs;
    return buildRecentRows(props.deal, props.documentsForRoom, boundaryMs);
  }, [props.deal, props.documentsForRoom, props.lastLoginAtMs]);

  const faqs = resolveDealFaqItems(props.deal?.faqs);

  const loginUnavailable = props.lastLoginAtMs == null;
  const ndaLocked = Boolean(props.room.investorDocsLockedByNda);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),280px]">
      {ndaLocked ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/40 bg-amber-50 px-5 py-4 text-sm text-amber-950 lg:col-span-2 dark:border-amber-400/35 dark:bg-amber-950/40 dark:text-amber-50"
        >
          <p className="font-semibold">Mutual NDA required before you can open diligence files</p>
          <p className="mt-2 leading-relaxed text-amber-950/90 dark:text-amber-50/95">
            This room requires a completed mutual NDA. Your sponsor sends a signing link — use{" "}
            <span className="font-medium">the same email you use here</span> so completion matches your account.
            After both parties finish signing, refresh this page; materials will unlock automatically.
          </p>
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
                    Signed {new Date(props.room.investorNdaSignedAt).toLocaleDateString()}
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
                        {new Date(props.room.investorNdaSignedAt).toLocaleString()}
                      </span>
                      .
                    </p>
                    <a
                      href={`/api/esign/room-nda/final-document?roomId=${encodeURIComponent(props.room.id)}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg")}
                    >
                      Download signed NDA
                    </a>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    The NDA must be signed by both parties before the final document is available here.
                  </p>
                )}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground">Key documents</h4>
              {!ndaLocked ? (
                <button
                  type="button"
                  onClick={props.onOpenDocuments}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open Documents tab
                </button>
              ) : null}
            </div>
            {ndaLocked ? (
              <p className="rounded-xl border border-dashed border-amber-500/35 bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                Files are locked until your NDA is completed.
              </p>
            ) : keyDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents in this room yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {keyDocs.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="min-w-0 truncate font-medium text-foreground">{d.name}</span>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {d.kind}
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
                  ? "No deal notes or new uploads showed up in roughly the last 90 days. Open the Documents tab for the full library."
                  : "No new deal notes or uploads since your last sign-in. Check the Documents tab for the full library."}
              </p>
            ) : (
              <ul className="space-y-4">
                {recentRows.map((row) =>
                  row.kind === "deal" ? (
                    <li key={row.key} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{row.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(row.at, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{row.body}</p>
                    </li>
                  ) : (
                    <li key={row.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">New file: {row.doc.name}</span>
                        <Badge variant="outline" className="ml-2 capitalize">
                          {row.doc.kind}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(row.at, { addSuffix: true })}
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
            <Link href="mailto:" className={cn(buttonVariants({ className: "rounded-xl" }))}>
              Contact sponsor
            </Link>
            <Link
              href={
                props.deal?.calendarBookingUrl && props.deal.calendarBookingUrl.startsWith("http")
                  ? props.deal.calendarBookingUrl
                  : "#"
              }
              className={cn(buttonVariants({ variant: "outline", className: "rounded-xl" }))}
            >
              Book a call
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Raise snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!props.room.dealId || !props.deal ? (
            <p className="text-muted-foreground">
              Link a deal in <span className="font-medium text-foreground">Settings</span> to populate target, minimum, and timeline.
            </p>
          ) : (
            <>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Raise target</p>
                <p className="mt-1 font-medium tabular-nums">
                  {props.deal.targetRaise != null ? `$${props.deal.targetRaise.toLocaleString()}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Minimum</p>
                <p className="mt-1 font-medium tabular-nums">
                  {props.deal.minimumInvestment != null
                    ? `$${props.deal.minimumInvestment.toLocaleString()}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Timeline</p>
                <p className="mt-1 font-medium">
                  {props.deal.closeDate
                    ? new Date(props.deal.closeDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "TBD"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Status</p>
                <p className="mt-1 font-medium capitalize">{props.deal.status.replace(/_/g, " ")}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
