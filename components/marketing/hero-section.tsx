"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import * as React from "react";
import { buttonVariants } from "@/components/ui/button";
import { BOOK_DEMO_HREF, SCREENSHOT } from "@/lib/marketing/constants";
import { cn } from "@/lib/utils";

/** Floating badges — primary-accent on first for hierarchy */
const FLOAT_BADGES = [
  { label: "Pipeline Visibility", className: "border-primary/30 bg-card/95 text-primary shadow-xl backdrop-blur-sm dark:bg-card", position: "left-[2%] top-[6%] hidden sm:block", rotate: -2 },
  { label: "Investor CRM", className: "border-border bg-card shadow-xl dark:bg-card", position: "right-[2%] top-[22%] hidden sm:block", rotate: 2 },
  { label: "Deal Rooms", className: "border-border bg-card shadow-xl dark:bg-card", position: "-left-1 bottom-[38%] hidden md:block xl:left-0", rotate: -1 },
  { label: "Data Rooms", className: "border-border bg-card shadow-xl dark:bg-card", position: "-right-1 top-[48%] hidden lg:block xl:-right-2", rotate: 1.5 },
  { label: "Task Automation", className: "border-primary/20 bg-card/95 text-primary shadow-xl backdrop-blur-sm dark:bg-card", position: "bottom-[8%] left-[6%] hidden lg:block", rotate: -1 },
] as const;

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start end", "end start"],
  });
  const yParallax = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -12]);

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-background via-muted/15 to-background dark:via-muted/10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(59,93,217,0.07),transparent_52%),radial-gradient(ellipse_at_20%_35%,rgba(37,71,169,0.05),transparent_48%)] dark:bg-[radial-gradient(ellipse_at_80%_0%,rgba(120,148,237,0.1),transparent_52%)]"
      />
      <div ref={scrollRef} className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-16">
          <div className="max-w-xl lg:max-w-none">
            <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">
              Private Capital Operating System
            </p>
            <h1
              id="hero-heading"
              className="font-heading mt-5 text-[2.125rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]"
            >
              Raise More Capital. Close Faster. Look Institutional.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Investor CRM, deal rooms, data rooms, outreach, and workflows built for sponsors, funds, syndicators,
              and private issuers.
            </p>

            <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
              <motion.a
                href={BOOK_DEMO_HREF}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: prefersReducedMotion ? 1 : 1.02 }}
                whileTap={{ scale: prefersReducedMotion ? 1 : 0.99 }}
                transition={{ type: "spring", stiffness: 400, damping: 26 }}
                className={cn(
                  buttonVariants({
                    size: "lg",
                    className:
                      "w-full rounded-xl px-8 shadow-lg ring-2 ring-primary/25 ring-offset-2 ring-offset-background sm:w-auto dark:ring-offset-background",
                  }),
                )}
              >
                Book Demo
              </motion.a>
              <motion.div whileHover={{ scale: prefersReducedMotion ? 1 : 1.02 }} whileTap={{ scale: prefersReducedMotion ? 1 : 0.99 }}>
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                      size: "lg",
                      className: "w-full rounded-xl border-border/90 bg-card shadow-sm sm:w-auto",
                    }),
                  )}
                >
                  Start Free Trial
                </Link>
              </motion.div>
            </div>

            <p className="mt-8 text-sm font-medium leading-relaxed text-muted-foreground">
              Built for sponsors, funds, SPVs, and private offerings.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
            {FLOAT_BADGES.map((badge, i) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className={cn("pointer-events-none absolute z-10", badge.position)}
                style={{ rotate: prefersReducedMotion ? 0 : badge.rotate }}
              >
                <span
                  className={cn(
                    "inline-block rounded-xl border px-3 py-1.5 font-heading text-[11px] font-semibold sm:text-xs",
                    badge.className,
                  )}
                >
                  {badge.label}
                </span>
              </motion.div>
            ))}

            <motion.div
              style={{
                y: prefersReducedMotion ? 0 : yParallax,
              }}
              whileHover={
                prefersReducedMotion
                  ? undefined
                  : {
                      rotate: -0.75,
                      scale: 1.015,
                      transition: { type: "spring", stiffness: 320, damping: 22 },
                    }
              }
              className="relative rounded-2xl border border-border/70 bg-gradient-to-br from-muted/55 via-card to-card p-[10px] shadow-[0_28px_72px_-14px_rgba(15,37,112,0.22)] ring-1 ring-border/55 dark:from-muted/35 dark:shadow-[0_28px_72px_-14px_rgba(0,0,0,0.48)]"
            >
              <div className="rounded-xl border border-border/45 bg-muted/75 px-3 py-2 dark:bg-muted/45">
                <div className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-destructive/80" aria-hidden />
                  <span className="size-3 rounded-full bg-warning/90" aria-hidden />
                  <span className="size-3 rounded-full bg-success/80" aria-hidden />
                </div>
              </div>
              <div className="relative mt-2 overflow-hidden rounded-lg border border-border/35 bg-muted/35 dark:bg-muted/28">
                <div className="relative aspect-[16/10] w-full bg-background">
                  <Image
                    src={SCREENSHOT.hero}
                    alt="CPIN platform dashboard preview"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1024px) min(100vw, 768px), min(560px, calc(50vw - 2rem))"
                    quality={90}
                    priority
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
