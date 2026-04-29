"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Download, Wallet, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtUsd } from "@/lib/deals/format";
import type { Deal } from "@/lib/firestore/types";
import { trackDealTelemetry } from "@/components/deals/deal-telemetry";
import { ExpressInterestButton } from "@/components/express-interest-button";

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

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md">
      <div className="border-b border-border/70 bg-gradient-to-br from-muted/40 via-card to-background px-4 py-5 sm:px-5 sm:py-6 md:px-6 md:py-6">
        <div className="flex flex-col gap-5 md:gap-6 xl:flex-row xl:items-start xl:justify-between xl:gap-6">
          <div className="min-w-0 flex-1 space-y-3">
            {d.logoUrl && !logoFailed ? (
              <div className="flex justify-center lg:justify-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.logoUrl}
                  alt=""
                  className="h-14 w-auto max-w-[160px] object-contain"
                  onError={() => setLogoFailed(true)}
                />
              </div>
            ) : null}
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Offering
              </p>
              <h1 className="mt-0.5 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {d.name}
              </h1>
              {d.tagline ? (
                <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{d.tagline}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {d.industry ? (
                  <Badge variant="secondary" className="rounded-lg">
                    {d.industry}
                  </Badge>
                ) : null}
                {d.stage ? (
                  <Badge variant="outline" className="rounded-lg">
                    {d.stage}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="rounded-lg capitalize">
                  {d.type.replace(/_/g, " ")}
                </Badge>
                <Badge variant="secondary" className="rounded-lg capitalize">
                  {d.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid w-full shrink-0 grid-cols-2 gap-1.5 sm:max-w-[16rem] md:max-w-[17rem] xl:w-[17rem]">
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
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:max-w-xs sm:flex-row sm:flex-wrap xl:w-[10.5rem] xl:max-w-none xl:flex-col">
            {props.guest ? (
              <>
                <Link
                  href="#commit"
                  className={cn(buttonVariants({ size: "default" }), "rounded-lg gap-2 shadow-sm")}
                  onClick={() => void trackDealTelemetry(d.id, "cta_commit_click")}
                >
                  <Wallet className="size-4" />
                  Commit capital
                </Link>
                {showBook && d.calendarBookingUrl ? (
                  <a
                    href={d.calendarBookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "default" }),
                      "rounded-lg gap-2",
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
                      "rounded-lg gap-2",
                    )}
                    onClick={() => void trackDealTelemetry(d.id, "cta_data_room_click")}
                  >
                    <Download className="size-4" />
                    Access data room
                  </Link>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <ExpressInterestButton dealId={d.id} dealName={d.name} />
                </div>
              </>
            ) : (
              <>
                {showDr ? (
                  <Link
                    href={`/data-room?deal=${encodeURIComponent(d.id)}`}
                    className={cn(buttonVariants({ variant: "outline", size: "default" }), "rounded-lg gap-2")}
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
                      "rounded-lg gap-2",
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
        "flex flex-col justify-center rounded-xl border border-border/70 bg-background/80 px-2.5 py-2 shadow-sm",
        props.highlight && "border-blue-500/20 bg-blue-500/5",
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
