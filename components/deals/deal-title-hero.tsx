"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Download, Wallet, Phone, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtUsd } from "@/lib/deals/format";
import type { Deal } from "@/lib/firestore/types";
import { trackDealTelemetry } from "@/components/deals/deal-telemetry";
import { ExpressInterestButton } from "@/components/express-interest-button";
import { RequestSubscriptionPacketButton } from "@/components/deals/request-subscription-packet-button";

export function DealTitleHero(props: {
  deal: Deal;
  raised: number;
  target: number;
  pct: number;
  investorCount: number;
  avgCheck: number;
  guest: boolean;
  hasDataRoom: boolean;
  showDataRoomCta: boolean;
  daysRemaining: number | null;
  momentumHints: string[];
  displayProgressPct: number;
}) {
  const d = props.deal;
  const [logoFailed, setLogoFailed] = React.useState(false);
  React.useEffect(() => {
    setLogoFailed(false);
  }, [d.logoUrl]);

  const cta = d.cta;
  const showBook =
    cta?.showBookCall !== false && Boolean(d.calendarBookingUrl);
  const showDr =
    props.showDataRoomCta && props.hasDataRoom && cta?.showDataRoom !== false;

  const thesis = d.tagline?.trim() || d.sponsorProfile?.trim()?.slice(0, 220);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md transition-shadow hover:shadow-lg">
      <div className="border-b border-border/70 bg-gradient-to-br from-muted/35 via-card to-background px-4 py-6 sm:px-5 md:px-6 md:py-7">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-stretch xl:justify-between xl:gap-8">
          {/* Left: identity */}
          <div className="min-w-0 flex-1 space-y-4 xl:max-w-[34%]">
            {d.logoUrl && !logoFailed ? (
              <div className="flex justify-center xl:justify-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.logoUrl}
                  alt=""
                  className="h-16 w-auto max-w-[180px] object-contain"
                  onError={() => setLogoFailed(true)}
                />
              </div>
            ) : null}
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Offering
              </p>
              <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl md:text-[1.75rem] leading-tight">
                {d.name}
              </h1>
              {thesis ? (
                <p className="mt-2 text-sm leading-relaxed text-foreground/90 sm:text-[0.9375rem]">
                  {thesis.length > 280 ? `${thesis.slice(0, 277)}…` : thesis}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {d.industry ? (
                  <Badge variant="secondary" className="rounded-lg font-medium">
                    {d.industry}
                  </Badge>
                ) : null}
                {d.stage ? (
                  <Badge variant="outline" className="rounded-lg font-medium">
                    {d.stage}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="rounded-lg font-medium capitalize">
                  {d.type.replace(/_/g, " ")}
                </Badge>
                <Badge variant="secondary" className="rounded-lg font-medium capitalize">
                  {d.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Center: KPI + progress */}
          <div className="flex w-full min-w-0 flex-1 flex-col gap-4 xl:max-w-md">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Metric label="Target raise" value={props.target > 0 ? fmtUsd(props.target) : "—"} />
              <Metric label="Raised" value={fmtUsd(props.raised)} highlight />
              <Metric
                label="% funded"
                value={`${props.pct.toFixed(props.pct < 1 ? 2 : 0)}%`}
                highlight
              />
              <Metric label="Investors joined" value={String(props.investorCount)} />
              <Metric
                label="Avg check"
                value={props.investorCount > 0 ? fmtUsd(props.avgCheck) : "—"}
              />
              <Metric
                label="Days remaining"
                value={
                  props.daysRemaining != null && props.daysRemaining >= 0
                    ? String(props.daysRemaining)
                    : "—"
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Raise progress</span>
                <span className="font-medium tabular-nums text-foreground">
                  {props.displayProgressPct.toFixed(
                    props.target > 0 && props.displayProgressPct < 1 ? 2 : 0,
                  )}
                  %
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/85"
                  initial={false}
                  animate={{ width: `${Math.min(100, props.displayProgressPct)}%` }}
                  transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>

            {props.momentumHints.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/60 pt-3">
                <span className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="size-3.5 text-primary" aria-hidden />
                  Momentum
                </span>
                {props.momentumHints.map((hint) => (
                  <span
                    key={hint}
                    className="rounded-full bg-muted/80 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {hint}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Right: CTAs */}
          <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap xl:w-[11.25rem] xl:flex-col xl:flex-nowrap">
            {props.guest ? (
              <>
                <Link
                  href="#commit"
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "justify-center gap-2 rounded-xl shadow-sm",
                  )}
                  onClick={() => void trackDealTelemetry(d.id, "cta_commit_click")}
                >
                  <Wallet className="size-4" />
                  Commit capital
                </Link>
                <RequestSubscriptionPacketButton
                  dealId={d.id}
                  variant="outline"
                  label="Request subscription packet"
                />
                {showBook && d.calendarBookingUrl ? (
                  <a
                    href={d.calendarBookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "default" }),
                      "justify-center gap-2 rounded-xl",
                    )}
                    onClick={() => void trackDealTelemetry(d.id, "cta_book_call_click")}
                  >
                    <Calendar className="size-4" />
                    Book founder call
                  </a>
                ) : null}
                {showDr ? (
                  <Link
                    href={`/data-room?deal=${encodeURIComponent(d.id)}`}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "default" }),
                      "justify-center gap-2 rounded-xl",
                    )}
                    onClick={() => void trackDealTelemetry(d.id, "cta_data_room_click")}
                  >
                    <Download className="size-4" />
                    Access data room
                  </Link>
                ) : null}
                <div className="pt-1">
                  <ExpressInterestButton dealId={d.id} dealName={d.name} variant="ghost" />
                </div>
              </>
            ) : (
              <>
                {showDr ? (
                  <Link
                    href={`/data-room?deal=${encodeURIComponent(d.id)}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "default" }),
                      "justify-center gap-2 rounded-xl",
                    )}
                  >
                    <Download className="size-4" />
                    Data room
                  </Link>
                ) : null}
                {showBook && d.calendarBookingUrl ? (
                  <a
                    href={d.calendarBookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "default" }),
                      "justify-center gap-2 rounded-xl",
                    )}
                  >
                    <Phone className="size-4" />
                    Book call
                  </a>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: string; highlight?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[3.5rem] flex-col justify-center rounded-xl border border-border/70 bg-background/90 px-2.5 py-2 shadow-sm",
        props.highlight && "border-primary/25 bg-primary/10",
        props.className,
      )}
    >
      <p className="text-[0.7rem] font-medium leading-tight text-muted-foreground text-balance sm:text-xs">
        {props.label}
      </p>
      <p className="mt-1 break-words font-heading text-base font-bold tabular-nums tracking-tight leading-tight sm:text-[1.0625rem]">
        {props.value}
      </p>
    </div>
  );
}
