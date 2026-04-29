"use client";

import * as React from "react";
import Link from "next/link";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Investor } from "@/lib/firestore/types";
import { investorLastFirstName } from "@/lib/investors/display-name";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "week";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function InvestorCalendarView(props: {
  investors: Investor[];
  className?: string;
}) {
  const [cursor, setCursor] = React.useState(() => new Date());
  const [mode, setMode] = React.useState<ViewMode>("month");

  const range = React.useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(cursor);
      const end = endOfWeek(cursor);
      return { start, end };
    }
    const ms = startOfMonth(cursor);
    const me = endOfMonth(cursor);
    return { start: startOfWeek(ms), end: endOfWeek(me) };
  }, [cursor, mode]);

  const days = eachDayOfInterval(range);

  const itemsByDay = React.useMemo(() => {
    const map = new Map<string, { investor: Investor; kind: "follow_up" | "meeting" }[]>();
    for (const inv of props.investors) {
      if (inv.nextFollowUpAt) {
        const d = format(inv.nextFollowUpAt, "yyyy-MM-dd");
        const arr = map.get(d) ?? [];
        arr.push({ investor: inv, kind: "follow_up" });
        map.set(d, arr);
      }
      if (inv.pipelineStage === "meeting_scheduled") {
        const d = format(inv.updatedAt, "yyyy-MM-dd");
        const arr = map.get(d) ?? [];
        if (!arr.some((x) => x.investor.id === inv.id))
          arr.push({ investor: inv, kind: "meeting" });
        map.set(d, arr);
      }
    }
    return map;
  }, [props.investors]);

  function nav(dir: -1 | 1) {
    setCursor((d) =>
      mode === "month"
        ? new Date(d.getFullYear(), d.getMonth() + dir, 1)
        : addDays(d, dir * 7),
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-4 shadow-sm", props.className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h3 className="font-heading text-lg font-semibold">
            {mode === "month"
              ? format(cursor, "MMMM yyyy")
              : `Week of ${format(range.start, "MMM d, yyyy")}`}
          </h3>
          <p className="text-xs text-muted-foreground">
            Follow-ups by next follow-up date · Meeting tint uses investors currently in meeting stage (approx.)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border/80 bg-muted/30 p-0.5">
            <Button
              type="button"
              variant={mode === "month" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-lg"
              onClick={() => setMode("month")}
            >
              Month
            </Button>
            <Button
              type="button"
              variant={mode === "week" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-lg"
              onClick={() => setMode("week")}
            >
              Week
            </Button>
          </div>
          <Button type="button" variant="outline" size="icon" className="rounded-xl" onClick={() => nav(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="rounded-xl" onClick={() => nav(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {mode === "month" ? (
        <div className="mt-4 grid grid-cols-7 gap-px rounded-xl border border-border/60 bg-border/60">
          {WEEKDAYS.map((w) => (
            <div key={w} className="bg-muted/40 px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground">
              {w}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const entries = itemsByDay.get(key) ?? [];
            const faded = mode === "month" && !isSameMonth(day, cursor);
            return (
              <div
                key={key}
                className={cn(
                  "min-h-[100px] bg-card p-2",
                  faded ? "opacity-35" : "",
                )}
              >
                <p className="mb-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {format(day, "d")}
                </p>
                <div className="flex flex-col gap-1">
                  {entries.slice(0, 4).map(({ investor, kind }) => (
                    <Link
                      key={`${investor.id}-${kind}`}
                      href={`/investors/${investor.id}`}
                      className={cn(
                        "truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight hover:underline",
                        kind === "follow_up"
                          ? "bg-primary/10 text-primary"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      )}
                      title={investorLastFirstName(investor)}
                    >
                      {kind === "follow_up" ? "FU · " : "Mt · "}
                      {investorLastFirstName(investor)}
                    </Link>
                  ))}
                  {entries.length > 4 ? (
                    <span className="text-[10px] text-muted-foreground">+{entries.length - 4}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-7 gap-px rounded-xl border border-border/60 bg-border/60">
          {WEEKDAYS.map((w) => (
            <div key={w} className="bg-muted/40 px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground">
              {w}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const entries = itemsByDay.get(key) ?? [];
            return (
              <div key={key} className="min-h-[120px] bg-card p-2">
                <p className="mb-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {format(day, "MMM d")}
                </p>
                <div className="flex flex-col gap-1">
                  {entries.map(({ investor, kind }) => (
                    <Link
                      key={`${investor.id}-${kind}`}
                      href={`/investors/${investor.id}`}
                      className={cn(
                        "truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium hover:underline",
                        kind === "follow_up"
                          ? "bg-primary/10 text-primary"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      )}
                    >
                      {kind === "follow_up" ? "FU · " : "Mt · "}
                      {investorLastFirstName(investor)}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
