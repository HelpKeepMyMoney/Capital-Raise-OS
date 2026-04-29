"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import * as React from "react";
import { buttonVariants } from "@/components/ui/button";
import { BOOK_DEMO_HREF, SCREENSHOT } from "@/lib/marketing/constants";
import { cn } from "@/lib/utils";

const FLOAT_BADGES = ["Pipeline Visibility", "Investor CRM", "Deal Rooms"] as const;

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start end", "end start"],
  });
  const yParallax = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -10]);

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-background via-muted/20 to-background dark:via-muted/10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(59,93,217,0.08),transparent_52%),radial-gradient(ellipse_at_20%_30%,rgba(37,71,169,0.06),transparent_45%)] dark:bg-[radial-gradient(ellipse_at_80%_0%,rgba(120,148,237,0.12),transparent_52%)]"
      />
      <div ref={scrollRef} className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-16">
          <div className="max-w-xl lg:max-w-none">
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Private Capital Operating System
            </p>
            <h1
              id="hero-heading"
              className="font-heading mt-5 text-[2.125rem] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.35rem]"
            >
              Raise Capital Like an Institution
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Investor CRM, deal rooms, data rooms, outreach, and workflows in one system built for sponsors,
              funds, syndicators, and private issuers.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <motion.a
                href={BOOK_DEMO_HREF}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: prefersReducedMotion ? 1 : 1.02 }}
                whileTap={{ scale: prefersReducedMotion ? 1 : 0.99 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(buttonVariants({ size: "lg", className: "rounded-xl px-6 shadow-md" }))}
              >
                Book Demo
              </motion.a>
              <Link
                href="#investor-crm"
                scroll
                className={cn(buttonVariants({ variant: "outline", size: "lg", className: "rounded-xl border-border/90 bg-card" }))}
              >
                See Platform
              </Link>
            </div>

            <p className="mt-6 text-sm font-medium leading-relaxed text-muted-foreground">
              Built for sponsors, funds, SPVs, and private offerings.
            </p>
          </div>

          {/* Laptop / browser mockup */}
          <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
            {/* Floating badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="pointer-events-none absolute -left-2 top-[8%] z-10 hidden sm:block xl:-left-4"
              style={{ rotate: prefersReducedMotion ? 0 : -2 }}
            >
              <span className="inline-block rounded-xl border border-primary/25 bg-card/95 px-3 py-1.5 font-heading text-xs font-semibold text-primary shadow-lg backdrop-blur-sm dark:bg-card">
                {FLOAT_BADGES[0]}
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="pointer-events-none absolute -right-1 top-[42%] z-10 hidden sm:block xl:-right-2"
              style={{ rotate: prefersReducedMotion ? 0 : 2 }}
            >
              <span className="inline-block rounded-xl border border-border bg-card px-3 py-1.5 font-heading text-xs font-semibold shadow-lg dark:bg-card">
                {FLOAT_BADGES[1]}
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="pointer-events-none absolute bottom-[10%] -left-1 z-10 hidden md:block xl:-left-3"
              style={{ rotate: prefersReducedMotion ? 0 : -1 }}
            >
              <span className="inline-block rounded-xl border border-border bg-card px-3 py-1.5 font-heading text-xs font-semibold shadow-lg dark:bg-card">
                {FLOAT_BADGES[2]}
              </span>
            </motion.div>

            <motion.div
              style={{ y: prefersReducedMotion ? 0 : yParallax }}
              className="relative rounded-2xl border border-border/80 bg-gradient-to-br from-muted/60 via-card to-card p-[10px] shadow-[0_24px_64px_-12px_rgba(15,37,112,0.18)] ring-1 ring-border/60 dark:from-muted/40 dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.45)]"
            >
              <div className="rounded-xl border border-border/50 bg-muted/80 px-3 py-2 dark:bg-muted/50">
                <div className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-destructive/80" aria-hidden />
                  <span className="size-3 rounded-full bg-warning/90" aria-hidden />
                  <span className="size-3 rounded-full bg-success/80" aria-hidden />
                </div>
              </div>
              <div className="relative mt-2 overflow-hidden rounded-lg border border-border/40 bg-muted/40 dark:bg-muted/30">
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
