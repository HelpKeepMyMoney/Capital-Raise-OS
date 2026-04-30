"use client";

import { motion } from "framer-motion";

const LABELS = [
  "Sponsors",
  "Funds",
  "Syndicators",
  "Real Estate Operators",
  "Private Issuers",
  "Family Offices",
  "Consultants",
] as const;

export function TrustBar() {
  return (
    <section aria-labelledby="trust-heading" className="border-b border-border/60 bg-muted/25 py-14 dark:bg-muted/12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2
          id="trust-heading"
          className="text-center text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
        >
          Built For Modern Capital Raisers
        </h2>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.04 },
            },
          }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-3.5 md:gap-4"
        >
          {LABELS.map((label) => (
            <motion.span
              key={label}
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.35 }}
              data-slot="card"
              className="rounded-full border-2 border-primary/25 bg-card px-5 py-2.5 text-base font-semibold text-foreground shadow-md ring-1 ring-border/40 transition-all duration-200 hover:border-primary/45 hover:bg-primary/[0.06] hover:shadow-lg dark:border-primary/35 dark:bg-card dark:ring-border/50 dark:hover:bg-primary/10"
            >
              {label}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
