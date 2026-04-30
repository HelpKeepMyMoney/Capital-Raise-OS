"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { BOOK_DEMO_HREF } from "@/lib/marketing/constants";
import { cn } from "@/lib/utils";

const GROWTH_MARKETING_FEATURES = [
  "Unlimited Investors",
  "Multiple Active Deal Rooms",
  "Full Data Rooms",
  "Workflow Automation",
  "Team Collaboration",
  "Priority Support",
];

type PricingCard = {
  title: string;
  subtitle?: string;
  price: string;
  /** Shown beside price, e.g. `/mo`; omit when not applicable */
  period?: string;
  desc: string;
  features: string[];
  highlighted: boolean;
  /** Badge above card (e.g. “Most Popular”) */
  topBadge?: string;
  /** Optional pill under description */
  eyebrow?: string;
  cta: { label: string; href: string; variant?: "default" | "outline"; external?: boolean };
};

export function PricingSection() {
  const reduced = useReducedMotion();

  const cards: PricingCard[] = [
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
      cta: { label: "Start Free Trial", href: "/signup" },
    },
    {
      title: "Growth",
      price: "$199",
      period: "/mo",
      desc: "For active sponsors and repeat capital raisers.",
      features: GROWTH_MARKETING_FEATURES,
      highlighted: true,
      topBadge: "Most Popular",
      cta: { label: "Start Free Trial", href: "/signup" },
    },
    {
      title: "Client",
      subtitle: "Offered for free to existing clients",
      price: "$0",
      desc: "For businesses that engage The BNIC Network LLC or Help Keep My Money LLC for capital advisory and related services.",
      features: GROWTH_MARKETING_FEATURES,
      highlighted: false,
      topBadge: "Client access",
      eyebrow: "No charge • By invitation through BNIC Network or Help Keep My Money",
      cta: {
        label: "Contact us",
        href: "/#contact",
        variant: "outline",
      },
    },
  ];

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-28 border-b border-border/60 bg-gradient-to-b from-muted/25 via-background to-background py-16 sm:py-20 lg:py-24 dark:border-border/40 dark:from-muted/10"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
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

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {cards.map((p) => (
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
              {p.topBadge ? (
                <span
                  className={cn(
                    "absolute -top-3 left-6 rounded-full px-3 py-1 font-heading text-[11px] font-bold uppercase tracking-widest shadow",
                    p.highlighted
                      ? "bg-primary text-primary-foreground"
                      : "border border-primary/35 bg-muted/90 text-foreground backdrop-blur-sm dark:bg-muted/70",
                  )}
                >
                  {p.topBadge}
                </span>
              ) : null}
              <h3 className="font-heading text-xl font-semibold text-foreground">{p.title}</h3>
              {p.subtitle ? (
                <p className="mt-1 text-sm font-medium text-muted-foreground">{p.subtitle}</p>
              ) : null}
              <p className="mt-6 flex items-end gap-1">
                <span className="font-heading text-[2.85rem] font-semibold tracking-tight text-foreground">
                  {p.price}
                </span>
                {p.period ? (
                  <span className="pb-3 text-muted-foreground">{p.period}</span>
                ) : (
                  <span className="sr-only">Per month pricing not applicable</span>
                )}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{p.desc}</p>
              {p.eyebrow ? (
                <p className="mt-2 rounded-lg border border-dashed border-border/80 bg-muted/30 px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-muted-foreground">
                  {p.eyebrow}
                </p>
              ) : null}
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
                  {p.cta.external ? (
                    <a
                      href={p.cta.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({
                          size: "lg",
                          variant: p.cta.variant ?? "default",
                          className: "w-full rounded-xl",
                        }),
                      )}
                    >
                      {p.cta.label}
                    </a>
                  ) : (
                    <Link
                      href={p.cta.href}
                      className={cn(
                        buttonVariants({
                          size: "lg",
                          variant: p.cta.variant ?? "default",
                          className: "w-full rounded-xl",
                        }),
                      )}
                    >
                      {p.cta.label}
                    </Link>
                  )}
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
