"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SerializedRoomDocument } from "@/components/data-room/types";
import type { ActivityFeedItemDTO } from "@/lib/data-room/server-queries";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { kindLabel } from "@/lib/data-room/kind-labels";

type Props = {
  documents: SerializedRoomDocument[];
  activityPreview: ActivityFeedItemDTO[];
};

export function ActivityAnalytics(props: Props) {
  const byKind: Record<string, number> = {};
  for (const d of props.documents) {
    byKind[d.kind] = (byKind[d.kind] ?? 0) + (d.viewCount ?? 0);
  }
  const chartData = Object.entries(byKind).map(([kind, views]) => ({
    name: kindLabel(kind).slice(0, 12),
    views,
  }));

  const totalViews = props.documents.reduce((a, d) => a + (d.viewCount ?? 0), 0);
  const topDoc = [...props.documents].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))[0];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Room intelligence</CardTitle>
          <CardDescription>Totals derived from document view counters (sign / open events).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">Total views</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{totalViews.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">Documents in room</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{props.documents.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 sm:col-span-2">
            <p className="text-xs uppercase text-muted-foreground">Most viewed</p>
            <p className="mt-1 truncate text-sm font-medium">{topDoc ? topDoc.name : "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Engagement by category</CardTitle>
          <CardDescription>Stacked view counts by document type.</CardDescription>
        </CardHeader>
        <CardContent className="h-56 w-full">
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Upload documents to populate this chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 8, right: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }}
                />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Timeline (audit)</CardTitle>
          <CardDescription>Sponsor-only recent data room events from the audit trail.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-80">
          {props.activityPreview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet — activity will appear as sponsors and investors use the room.</p>
          ) : (
            <ScrollArea className="h-72 pr-3">
              <ul className="space-y-4">
                {props.activityPreview.map((a) => (
                  <li key={a.id} className="relative border-l border-border pl-5 text-sm">
                    <span className="absolute -left-1.5 top-1.5 block h-3 w-3 rounded-full bg-primary" />
                    <p className="font-medium">{a.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(a.createdAt, { addSuffix: true })}
                    </p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
