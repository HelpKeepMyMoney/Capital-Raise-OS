"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { BOOK_DEMO_HREF } from "@/lib/marketing/constants";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const reduced = useReducedMotion();

  const plans = [
    {
      title: "Starter",
      price: "$79",
      period: "/mo",
      desc: "For solo sponsors and first time raises.",
      features: [
        "Investor CRM",
        "1 Active Deal Room",
        "Basic Data Room",
        "Tasks & Follow Ups",
        "Email Support",
      ],
      highlighted: false,
    },
    {
      title: "Growth",
      price: "$199",
      period: "/mo",
      desc: "For active sponsors and repeat capital raisers.",
      features: [
        "Unlimited Investors",
        "Multiple Active Deal Rooms",
        "Full Data Rooms",
        "Workflow Automation",
        "Team Collaboration",
        "Priority Support",
      ],
      highlighted: true,
    },
  ];

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-28 border-b border-border/60 bg-gradient-to-b from-muted/25 via-background to-background py-16 sm:py-20 lg:py-24 dark:border-border/40 dark:from-muted/10"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <motion.h2
            id="pricing-heading"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Simple Pricing for Serious Capital Raisers
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ delay: 0.06 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
          >
            Start lean. Upgrade when your raise accelerates.
          </motion.p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
          {plans.map((p) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-70px" }}
              whileHover={reduced ? undefined : { y: -4 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              data-slot="card"
              className={cn(
                "relative flex flex-col rounded-2xl border p-8 shadow-md",
                p.highlighted
                  ? "border-primary/50 bg-card ring-2 ring-primary/45 shadow-[0_28px_72px_-18px_oklch(0.48_0.18_258/0.5)] dark:border-primary/55 dark:shadow-[0_28px_72px_-18px_oklch(0.62_0.14_258/0.35)]"
                  : "border-border/80 bg-card",
              )}
            >
              {p.highlighted ? (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 font-heading text-[11px] font-bold uppercase tracking-widest text-primary-foreground shadow">
                  Most Popular
                </span>
              ) : null}
              <h3 className="font-heading text-xl font-semibold text-foreground">{p.title}</h3>
              <p className="mt-6 flex items-end gap-1">
                <span className="font-heading text-[2.85rem] font-semibold tracking-tight text-foreground">
                  {p.price}
                </span>
                <span className="pb-3 text-muted-foreground">{p.period}</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Includes</p>
                <ul className="mt-4 space-y-3 text-muted-foreground">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm">
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-primary/90" aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10">
                <motion.div whileHover={{ scale: reduced ? 1 : 1.02 }} whileTap={{ scale: reduced ? 1 : 0.99 }}>
                  <Link
                    href="/signup"
                    className={cn(
                      buttonVariants({ size: "lg", className: "w-full rounded-xl" }),
                    )}
                  >
                    Start Free Trial
                  </Link>
                </motion.div>
              </div>
            </motion.article>
          ))}
        </div>

        <p className="mt-10 text-center text-sm leading-relaxed text-muted-foreground">
          Need white label, onboarding, or team rollout?{" "}
          <a
            href={BOOK_DEMO_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Book a Demo
          </a>
        </p>
      </div>
    </section>
  );
}
