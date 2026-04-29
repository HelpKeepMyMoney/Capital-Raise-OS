"use client";

import { motion } from "framer-motion";

const LABELS = [
  "Sponsors",
  "Funds",
  "Syndicators",
  "Real Estate Operators",
  "Private Issuers",
  "Family Offices",
];

export function TrustBar() {
  return (
    <section aria-labelledby="trust-heading" className="border-y border-border/60 bg-muted/30 py-10 dark:bg-muted/15">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p id="trust-heading" className="text-center font-heading text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Built for
        </p>
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
          className="mt-5 flex flex-wrap items-center justify-center gap-2 md:gap-3"
        >
          {LABELS.map((label) => (
            <motion.span
              key={label}
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.35 }}
              data-slot="card"
              className="rounded-full border border-border/70 bg-card px-4 py-1.5 text-sm font-medium text-card-foreground shadow-sm"
            >
              {label}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
