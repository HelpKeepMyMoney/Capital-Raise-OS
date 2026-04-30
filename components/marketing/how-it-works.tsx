"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

const steps = [
  {
    step: "01",
    title: "Build and Qualify Your Investor Pipeline",
    primary:
      "Capture every investor, track fit, and understand who is most likely to convert.",
    bullets: [
      "Track investor type, check size, and preferences",
      "Score and prioritize high-probability prospects",
      "Log conversations and relationship context",
      "Move investors through structured pipeline stages",
    ],
  },
  {
    step: "02",
    title: "Launch Your Offering and Capture Interest",
    primary:
      "Create a professional deal experience that turns attention into real investor intent.",
    bullets: [
      "Publish a branded offering page",
      "Share documents through a secure data room",
      "Track who views, clicks, and engages",
      "Capture soft commits and investor signals",
    ],
  },
  {
    step: "03",
    title: "Convert Commitments and Close Capital",
    primary:
      "Manage the closing process with full visibility into commitments, documents, and next steps.",
    bullets: [
      "Track committed vs funded capital",
      "Manage follow ups and closing tasks",
      "Coordinate documents and investor communication",
      "Maintain momentum through final wire",
    ],
  },
] as const;

function StepCard({
  item,
  index,
  reducedMotion,
}: {
  item: (typeof steps)[number];
  index: number;
  reducedMotion: boolean;
}) {
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={
        reducedMotion ? { duration: 0 } : { duration: 0.4, ease: "easeOut", delay: index * 0.06 }
      }
      whileHover={reducedMotion ? undefined : { y: -4 }}
      data-slot="card"
      className={cn(
        "flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 ease-out dark:border-border dark:bg-card",
        !reducedMotion && "hover:shadow-md",
      )}
    >
      <span className="mb-2 text-sm font-medium tabular-nums text-primary">{item.step}</span>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
      <p className="text-base leading-relaxed text-foreground">{item.primary}</p>
      <div className="my-4 h-px bg-gray-100 dark:bg-gray-800" aria-hidden />
      <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground/70">
        {item.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </motion.article>
  );
}

export function HowItWorksSection() {
  const reducedMotion = Boolean(useReducedMotion());

  return (
    <section
      aria-labelledby="how-heading"
      className="scroll-mt-28 border-b border-border/60 bg-gradient-to-b from-background via-muted/15 to-background py-16 dark:border-border/40 dark:via-muted/8 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.h2
          id="how-heading"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: reducedMotion ? 0 : 0.45 }}
          className="text-center text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
        >
          From First Contact to Final Wire
        </motion.h2>
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.05 }}
          className="mx-auto mb-12 mt-3 max-w-2xl text-center text-base text-muted-foreground md:text-lg"
        >
          A structured system to move investors from interest to commitment without losing momentum.
        </motion.p>

        {/* Mobile: stacked */}
        <div className="grid gap-6 md:hidden">
          {steps.map((item, index) => (
            <StepCard key={item.step} item={item} index={index} reducedMotion={reducedMotion} />
          ))}
        </div>

        {/* Desktop: row + subtle connectors in gaps */}
        <div className="hidden md:flex md:flex-row md:items-stretch md:gap-0">
          {steps.map((item, index) => (
            <Fragment key={item.step}>
              <div className="flex h-full min-w-0 flex-1 flex-col">
                <StepCard item={item} index={index} reducedMotion={reducedMotion} />
              </div>
              {index < steps.length - 1 ? (
                <div
                  className="flex w-6 shrink-0 items-start justify-center px-0 pt-12 md:pt-14"
                  aria-hidden
                >
                  <div className="h-px w-full rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
