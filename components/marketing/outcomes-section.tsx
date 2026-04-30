"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BellRing, Building2, Clock, TrendingUp } from "lucide-react";
import { OutcomeCard } from "@/components/marketing/outcome-card";

const outcomes = [
  {
    icon: TrendingUp,
    title: "Close More Investors",
    primary:
      "See exactly where every investor stands and what needs to happen next to get them to wire.",
    supporting:
      "Track pipeline stages, commitments, and engagement so no opportunity stalls or slips through.",
  },
  {
    icon: Clock,
    title: "Eliminate Spreadsheet Chaos",
    primary: "Replace fragmented tools with a single system for managing your entire capital raise.",
    supporting:
      "Centralize investor data, conversations, documents, and deal progress in one structured workspace.",
  },
  {
    icon: Building2,
    title: "Present Like an Institution",
    primary:
      "Deliver a clean, organized, and professional experience that builds investor confidence immediately.",
    supporting:
      "Use structured deal pages, clear terms, and organized materials that reflect institutional standards.",
  },
  {
    icon: BellRing,
    title: "Never Miss a Follow Up",
    primary:
      "Stay on top of every conversation and next step without relying on memory or manual tracking.",
    supporting:
      "Automate reminders, assign tasks, and keep deals moving forward with built in workflow execution.",
  },
] as const;

export function OutcomesSection() {
  const reducedMotion = Boolean(useReducedMotion());

  return (
    <section
      id="why-cpin"
      aria-labelledby="why-cpin-heading"
      className="relative border-t border-gray-100 bg-background py-14 md:py-20 dark:border-border"
    >
      <span id="outcomes" className="pointer-events-none absolute left-0 top-0 size-0 overflow-hidden" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="mb-12 md:mb-16">
          <motion.h2
            id="why-cpin-heading"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: reducedMotion ? 0 : 0.4, ease: "easeOut" }}
            className="text-center text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            Why Serious Capital Raisers Use CPIN
          </motion.h2>
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: reducedMotion ? 0 : 0.4, ease: "easeOut", delay: reducedMotion ? 0 : 0.05 }}
            className="mx-auto mt-3 max-w-2xl text-center text-base text-muted-foreground md:text-lg"
          >
            Run your entire raise with structure, visibility, and control.
          </motion.p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {outcomes.map((item, index) => (
            <OutcomeCard
              key={item.title}
              icon={item.icon}
              title={item.title}
              primary={item.primary}
              supporting={item.supporting}
              index={index}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
