"use client";

import * as React from "react";
import Link from "next/link";
import { X, AlertTriangle, Bell, TrendingUp, CalendarClock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DashboardAlert } from "@/components/dashboard/alert-bar";

const toneStyles = {
  urgent: "border-destructive/35 bg-destructive/8 text-foreground",
  warning: "border-warning/45 bg-warning/12 text-foreground",
  gold: "border-warning/40 bg-warning/10 text-foreground",
  info: "border-primary/30 bg-primary/5 text-foreground",
};

const icons = {
  urgent: AlertTriangle,
  warning: Bell,
  gold: TrendingUp,
  info: CalendarClock,
};

export function AlertStrip(props: { alerts: DashboardAlert[] }) {
  const [hidden, setHidden] = React.useState<Set<string>>(() => new Set());
  const visible = props.alerts.filter((a) => !hidden.has(a.id));
  const showHealthy = visible.length === 0;

  return (
    <div role="region" aria-label="Dashboard alerts" className="w-full min-w-0">
      {showHealthy ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/8 px-4 py-3 text-sm shadow-sm"
        >
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
          <p className="font-medium leading-snug text-foreground">All systems operating normally</p>
        </motion.div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:h-1.5">
          <AnimatePresence mode="popLayout">
            {visible.map((a, i) => {
              const Icon =
                a.tone === "urgent"
                  ? icons.urgent
                  : a.tone === "warning"
                    ? icons.warning
                    : a.tone === "gold"
                      ? icons.gold
                      : icons.info;
              const card = (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className={cn(
                    "flex min-w-[min(100%,280px)] shrink-0 items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm backdrop-blur-sm transition-colors hover:opacity-[0.97] sm:min-w-0 sm:flex-1 sm:basis-[calc(50%-0.375rem)] lg:basis-[calc(33.333%-0.25rem)]",
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
                </motion.div>
              );
              if (a.href) {
                return (
                  <Link
                    key={a.id}
                    href={a.href}
                    className="min-w-[min(100%,280px)] shrink-0 text-inherit no-underline sm:min-w-0 sm:flex-1 sm:basis-[calc(50%-0.375rem)] lg:basis-[calc(33.333%-0.25rem)]"
                  >
                    {card}
                  </Link>
                );
              }
              return <React.Fragment key={a.id}>{card}</React.Fragment>;
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
