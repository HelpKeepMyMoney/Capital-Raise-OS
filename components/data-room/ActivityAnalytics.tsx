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
  LineChart,
  Line,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { kindLabel } from "@/lib/data-room/kind-labels";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";

type Props = {
  documents: SerializedRoomDocument[];
  activityPreview: ActivityFeedItemDTO[];
};

function fillLastDays(count: number, counts: Map<string, number>): { day: string; opens: number }[] {
  const out: { day: string; opens: number }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key.slice(5), opens: counts.get(key) ?? 0 });
  }
  return out;
}

export function ActivityAnalytics(props: Props) {
  const mounted = useMounted();
  const byKind: Record<string, number> = {};
  for (const d of props.documents) {
    byKind[d.kind] = (byKind[d.kind] ?? 0) + (d.viewCount ?? 0);
  }
  const chartData = Object.entries(byKind).map(([kind, views]) => ({
    name: kindLabel(kind).slice(0, 12),
    views,
  }));

  const totalViews = props.documents.reduce((a, d) => a + (d.viewCount ?? 0), 0);
  const topDocs = [...props.documents]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 6)
    .map((d) => ({ name: d.name.slice(0, 28) + (d.name.length > 28 ? "…" : ""), views: d.viewCount ?? 0 }));

  const opens = props.activityPreview.filter((a) => a.action === "data_room.signed_url");
  const byDay = new Map<string, number>();
  for (const e of opens) {
    const key = new Date(e.createdAt).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const viewsByDay = fillLastDays(14, byDay);
  const lastActivity =
    props.activityPreview.length > 0
      ? Math.max(...props.activityPreview.map((a) => a.createdAt))
      : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl border-border shadow-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Engagement overview</CardTitle>
          <CardDescription>
            Room document metrics are per-room. Audit-based charts use org-wide opens (signed URL events) as a proxy —
            not session-level tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">Total views (docs)</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{totalViews.toLocaleString("en-US")}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">Documents in room</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{props.documents.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">Most viewed</p>
            <p className="mt-1 truncate text-sm font-medium">
              {topDocs[0] ? topDocs[0].name : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">Last audit activity</p>
            <p className="mt-1 text-sm font-medium">
              {lastActivity ? (mounted ? formatDistanceToNow(lastActivity, { addSuffix: true }) : "—") : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Metrics requiring deeper instrumentation</CardTitle>
          <CardDescription>
            These are not computed from current data. They stay disabled until product adds session or identity events.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {["Unique investors", "Avg. session time", "Drop-off point"].map((label) => (
            <div
              key={label}
              className={cn(
                "rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground",
              )}
            >
              <p className="font-medium text-foreground/80">{label}</p>
              <p className="mt-1 text-xs">Not available from current audit payloads.</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Opens by day (org proxy)</CardTitle>
          <CardDescription>Count of signed-URL opens from the audit trail, last 14 days.</CardDescription>
        </CardHeader>
        <CardContent className="h-56 w-full">
          {opens.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open events in the sampled window.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viewsByDay} margin={{ left: 0, right: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }}
                />
                <Line type="monotone" dataKey="opens" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Top documents (views)</CardTitle>
          <CardDescription>This room only.</CardDescription>
        </CardHeader>
        <CardContent className="h-56 w-full">
          {topDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Upload documents to populate this chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDocs} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }}
                />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Engagement by category</CardTitle>
          <CardDescription>View counts by document type in this room.</CardDescription>
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
          <CardTitle className="text-base font-semibold">Activity timeline</CardTitle>
          <CardDescription>Recent data room events from the audit trail (org scope).</CardDescription>
        </CardHeader>
        <CardContent className="max-h-80">
          {props.activityPreview.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events yet — activity will appear as sponsors and investors use the room.
            </p>
          ) : (
            <ScrollArea className="h-72 pr-3">
              <ul className="space-y-4">
                {props.activityPreview.map((a) => (
                  <li key={a.id} className="relative border-l border-border pl-5 text-sm">
                    <span className="absolute -left-1.5 top-1.5 block h-3 w-3 rounded-full bg-primary" />
                    <p className="font-medium">{a.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {mounted ? formatDistanceToNow(a.createdAt, { addSuffix: true }) : "—"}
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
