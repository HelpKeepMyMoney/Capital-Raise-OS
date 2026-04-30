"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { BOOK_DEMO_HREF } from "@/lib/marketing/constants";
import { cn } from "@/lib/utils";

export function CTASection() {
  const reducedMotion = Boolean(useReducedMotion());

  return (
    <section
      aria-labelledby="final-cta-heading"
      className="w-full bg-sidebar py-16 text-sidebar-primary-foreground dark:bg-sidebar"
    >
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <motion.h2
          id="final-cta-heading"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: reducedMotion ? 0 : 0.45 }}
          className="mb-4 text-3xl font-semibold tracking-tight text-white md:text-4xl"
        >
          Stop Managing Your Raise in Spreadsheets
        </motion.h2>
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.05 }}
          className="mb-6 text-base leading-relaxed text-white/88 md:text-lg"
        >
          Run investor relationships, offerings, diligence, and closing from one system.
        </motion.p>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.08 }}
          className="flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:justify-center"
        >
          <Link
            href="/signup"
            className={cn(
              buttonVariants({
                size: "lg",
                className:
                  "w-full rounded-xl bg-white font-semibold text-primary shadow-md hover:bg-white/95 hover:text-primary sm:w-auto dark:bg-white dark:text-primary dark:hover:bg-white/95",
              }),
            )}
          >
            Start Free Trial
          </Link>
          <a
            href={BOOK_DEMO_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({
                size: "lg",
                variant: "outline",
                className:
                  "w-full rounded-xl border-white/45 bg-transparent font-semibold text-white hover:bg-white/10 hover:text-white sm:w-auto dark:border-white/45 dark:text-white dark:hover:bg-white/10 dark:hover:text-white",
              }),
            )}
          >
            Book Demo
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/** @deprecated Use CTASection */
export const FinalCtaSection = CTASection;
