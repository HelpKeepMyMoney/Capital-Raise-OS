"use client";

import { motion } from "framer-motion";
import { blocksFromNarrative, type WhyInvestNarrative } from "@/lib/deals/why-invest-narrative";
import type { DealWhyInvestBlock } from "@/lib/firestore/types";
import { Lightbulb, LineChart, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = [Lightbulb, Target, Zap, TrendingUp, LineChart, Trophy] as const;

export function WhyInvest(props: {
  blocks?: DealWhyInvestBlock[];
  narrative?: WhyInvestNarrative;
  className?: string;
}) {
  let blocks = props.blocks?.filter((b) => b.title.trim() && b.body.trim()) ?? [];
  if (blocks.length === 0) blocks = blocksFromNarrative(props.narrative);

  if (blocks.length === 0) return null;

  return (
    <section className={cn("space-y-6", props.className)}>
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Why invest</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What makes this opportunity compelling for qualified investors.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {blocks.map((b, i) => {
          const Icon = ICONS[i % ICONS.length]!;
          const isFirst = i === 0;
          /** First card is full width; if that leaves an odd count of following cards, last sits alone — span it full width too. */
          const tailCount = blocks.length - 1;
          const orphanLast =
            i === blocks.length - 1 && blocks.length > 1 && tailCount % 2 === 1;
          const fullRow = isFirst || orphanLast;
          return (
            <motion.article
              key={`${b.title}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6 md:p-7",
                fullRow && "md:col-span-2",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700 dark:text-blue-300">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-snug">{b.title}</h3>
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
