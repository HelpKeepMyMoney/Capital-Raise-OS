"use client";

import * as React from "react";
import Link from "next/link";
import { X, AlertTriangle, Bell, TrendingUp, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type DashboardAlert = {
  id: string;
  tone: "urgent" | "warning" | "gold" | "info";
  message: string;
  href?: string;
};

const toneStyles = {
  urgent: "border-destructive/40 bg-destructive/8 text-foreground",
  warning: "border-warning/50 bg-warning/15 text-foreground",
  gold: "border-warning/40 bg-warning/10 text-foreground",
  info: "border-primary/25 bg-primary/5 text-foreground",
};

const icons = {
  urgent: AlertTriangle,
  warning: Bell,
  gold: TrendingUp,
  info: CalendarClock,
};

export function DashboardAlertBar(props: { alerts: DashboardAlert[] }) {
  const [hidden, setHidden] = React.useState<Set<string>>(() => new Set());

  const visible = props.alerts.filter((a) => !hidden.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2" role="region" aria-label="Dashboard alerts">
      {visible.map((a) => {
        const Icon =
          a.tone === "urgent"
            ? icons.urgent
            : a.tone === "warning"
              ? icons.warning
              : a.tone === "gold"
                ? icons.gold
                : icons.info;
        const inner = (
          <div
            className={cn(
              "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm backdrop-blur-sm",
              toneStyles[a.tone],
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0 opacity-85" aria-hidden />
            <p className="min-w-0 flex-1 leading-snug">{a.message}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-lg"
              aria-label="Dismiss"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setHidden((s) => new Set(s).add(a.id));
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        );
        return a.href ? (
          <Link key={a.id} href={a.href} className="block transition-opacity hover:opacity-95">
            {inner}
          </Link>
        ) : (
          <div key={a.id}>{inner}</div>
        );
      })}
    </div>
  );
}
