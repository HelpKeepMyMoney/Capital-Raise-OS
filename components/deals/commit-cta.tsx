"use client";

import Link from "next/link";
import { Calendar, Phone, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { trackDealTelemetry } from "@/components/deals/deal-telemetry";
import { cn } from "@/lib/utils";

export function CommitCTA(props: {
  dealId: string;
  showCommit: boolean;
  commitHref?: string;
  showBookCall: boolean;
  calendarUrl?: string;
  showDataRoom: boolean;
  dataRoomHref?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-gradient-to-br from-blue-600/10 via-card to-emerald-500/5 p-8 shadow-md md:p-10",
        props.className,
      )}
    >
      <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
        Ready to participate?
      </h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Indicate interest or allocate—your sponsor will confirm next steps and documentation.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {props.showCommit && props.commitHref ? (
          <Link
            href={props.commitHref}
            className={cn(buttonVariants({ size: "lg" }), "rounded-xl shadow-sm")}
            onClick={() => void trackDealTelemetry(props.dealId, "cta_commit_click")}
          >
            <Wallet className="mr-2 size-5" />
            Commit capital
          </Link>
        ) : null}
        {props.showCommit ? (
          <a
            href="#express-interest"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "inline-flex rounded-xl")}
          >
            Express interest
          </a>
        ) : null}
        {props.showBookCall && props.calendarUrl ? (
          <a
            href={props.calendarUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "rounded-xl")}
            onClick={() => void trackDealTelemetry(props.dealId, "cta_book_call_click")}
          >
            <Phone className="mr-2 size-5" />
            Book call
          </a>
        ) : null}
        {props.showDataRoom && props.dataRoomHref ? (
          <Link
            href={props.dataRoomHref}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-xl")}
            onClick={() => void trackDealTelemetry(props.dealId, "cta_data_room_click")}
          >
            <Calendar className="mr-2 size-5" />
            Data room
          </Link>
        ) : null}
      </div>
    </section>
  );
}
