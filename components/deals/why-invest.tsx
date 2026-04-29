"use client";

import { motion } from "framer-motion";
import { threePillarWhyInvestBlocks } from "@/lib/deals/why-invest-narrative";
import type { Deal } from "@/lib/firestore/types";
import { Lightbulb, LineChart, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const PILLAR_ICONS = [Lightbulb, Target, LineChart] as const;

export function WhyInvest(props: { deal: Deal; className?: string }) {
  const blocks = threePillarWhyInvestBlocks(props.deal);
  if (blocks.length === 0) return null;

  return (
    <section className={cn("space-y-6", props.className)}>
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Why invest</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What makes this opportunity compelling for qualified investors.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {blocks.slice(0, 3).map((b, i) => {
          const Icon = PILLAR_ICONS[i] ?? Lightbulb;
          return (
            <motion.article
              key={`${b.title}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
            >
              <div className="flex h-full flex-col gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-base font-semibold leading-snug">{b.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {b.body}
                  </p>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
