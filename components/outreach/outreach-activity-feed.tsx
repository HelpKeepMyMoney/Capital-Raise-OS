"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OutreachEvent } from "@/lib/firestore/types";

export function OutreachActivityFeed(props: { events: OutreachEvent[] }) {
  return (
    <Card className="rounded-2xl border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[360px] space-y-3 overflow-y-auto">
        {props.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No outreach events yet.</p>
        ) : (
          props.events.map((e) => (
            <div
              key={e.id}
              className="flex items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-0"
            >
              <div>
                <p className="text-sm font-medium capitalize">
                  {e.eventType.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-muted-foreground">Investor {e.investorId.slice(0, 8)}…</p>
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(e.createdAt, { addSuffix: true })}
              </time>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
