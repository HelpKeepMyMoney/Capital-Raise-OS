"use client";

import type { SerializedDataRoom } from "@/components/data-room/types";
import type { Deal } from "@/lib/firestore/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  room: SerializedDataRoom;
  deal: Deal | null | undefined;
};

export function InvestorPreview(props: Props) {
  const welcome = props.room.welcomeMessage?.trim()
    ? props.room.welcomeMessage
    : "Welcome to the diligence room. Review materials and reach out with diligence questions.";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),280px]">
      <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
        <div className="border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-8 py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Investor portal</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {props.deal?.name ?? props.room.name}
          </h3>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{welcome}</p>
        </div>
        <CardContent className="space-y-8 p-8">
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Key documents</h4>
            <p className="text-sm text-muted-foreground">
              Deck, model, and legal work product appear in the Documents tab for your team; investors see the curated set you
              expose.
            </p>
          </section>
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Recent updates</h4>
            <p className="text-sm text-muted-foreground">
              Post closing memos and qualitative updates under the deal record — preview hook for LP communications.
            </p>
          </section>
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">FAQ</h4>
            <p className="text-sm text-muted-foreground">
              Map diligence FAQs from the linked deal when available; placeholders show when the deal is unlinked.
            </p>
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
