"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Calendar } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDealPageViewTelemetry } from "@/components/deals/deal-telemetry";

export function DealDetailShell(props: {
  dealId: string;
  dealName: string;
  guest: boolean;
  /** 0–100 display progress */
  progressPct: number;
  showBookCall: boolean;
  calendarBookingUrl?: string | null;
  children: React.ReactNode;
}) {
  const [showSticky, setShowSticky] = React.useState(false);
  const reduceMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useDealPageViewTelemetry(props.dealId, true);

  React.useEffect(() => {
    const el = document.getElementById("deal-hero-anchor");
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        setShowSticky(!e?.isIntersecting);
      },
      { rootMargin: "-72px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const pct = Math.min(100, Math.max(0, props.progressPct));

  return (
    <div className="relative pb-24 md:pb-28">
      {props.children}
      <AnimatePresence>
        {props.guest && showSticky ? (
          <motion.div
            initial={reduceMotion ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-card/88"
          >
            <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:px-6">
              <div className="hidden min-w-0 flex-1 sm:block">
                <p className="truncate font-heading text-sm font-semibold text-foreground">
                  {props.dealName}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 max-w-[200px] overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {pct.toFixed(pct < 1 && pct > 0 ? 2 : 0)}%
                  </span>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                {props.showBookCall && props.calendarBookingUrl ? (
                  <a
                    href={props.calendarBookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "default" }),
                      "hidden w-full justify-center rounded-xl sm:inline-flex sm:w-auto",
                    )}
                  >
                    <Calendar className="mr-2 size-4" />
                    Book call
                  </a>
                ) : null}
                <Link
                  href="#commit"
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "w-full justify-center rounded-xl shadow-sm sm:w-auto",
                  )}
                >
                  <Wallet className="mr-2 size-4" />
                  Commit capital
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
