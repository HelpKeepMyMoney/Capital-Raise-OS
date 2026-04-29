"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Meeting, Task } from "@/lib/firestore/types";

export function TaskCalendar(props: { tasks: Task[]; meetings: Meeting[] }) {
  const [cursor, setCursor] = React.useState(() => new Date());
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const blanks = Array.from({ length: mondayOffset }, (_, i) => i);

  function dots(day: Date) {
    const ts = props.tasks.filter(
      (t) =>
        t.status === "open" &&
        t.dueAt != null &&
        isSameDay(new Date(t.dueAt), day),
    ).length;
    const ms = props.meetings.filter(
      (m) => m.status === "scheduled" && isSameDay(new Date(m.startsAt), day),
    ).length;
    return { ts, ms };
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-lg font-semibold font-heading">{format(cursor, "MMMM yyyy")}</p>
          <p className="text-xs text-muted-foreground">Due tasks and scheduled meetings</p>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-lg"
            onClick={() => setCursor((d) => addMonths(d, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-lg"
            onClick={() => setCursor((d) => addMonths(d, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {blanks.map((b) => (
          <div key={`b-${b}`} className="min-h-[72px] rounded-lg bg-muted/10" />
        ))}
        {days.map((day) => {
          const { ts, ms } = dots(day);
          const today = isSameDay(day, new Date());
          const inMonth = isSameMonth(day, cursor);
          return (
            <div
              key={day.toISOString()}
              className={`flex min-h-[72px] flex-col rounded-lg border border-border/50 p-1.5 text-xs ${
                today ? "border-primary/40 bg-primary/[0.06]" : ""
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <span className={`text-[11px] font-medium ${today ? "text-primary" : ""}`}>
                {format(day, "d")}
              </span>
              <div className="mt-auto flex flex-wrap gap-0.5">
                {ts > 0 ? (
                  <span className="rounded-full bg-blue-500/90 px-1.5 py-0 text-[9px] leading-none text-white">
                    {ts}t
                  </span>
                ) : null}
                {ms > 0 ? (
                  <span className="rounded-full bg-emerald-600/90 px-1.5 py-0 text-[9px] leading-none text-white">
                    {ms}m
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-blue-500" /> Tasks due
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-emerald-600" /> Meetings
        </span>
      </div>
    </div>
  );
}
