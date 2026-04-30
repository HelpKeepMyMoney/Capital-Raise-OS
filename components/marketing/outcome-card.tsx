"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type OutcomeCardProps = {
  icon: LucideIcon;
  title: string;
  primary: string;
  supporting: string;
  index: number;
  reducedMotion: boolean;
};

export function OutcomeCard({
  icon: Icon,
  title,
  primary,
  supporting,
  index,
  reducedMotion,
}: OutcomeCardProps) {
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 0.4, ease: "easeOut", delay: index * 0.07 }
      }
      whileHover={reducedMotion ? undefined : { y: -4 }}
      className={cn(
        "flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 ease-out dark:border-border dark:bg-card",
        !reducedMotion && "hover:shadow-md",
      )}
    >
      <div
        className="mb-4 flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15"
        aria-hidden
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-foreground md:text-base">{primary}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{supporting}</p>
    </motion.article>
  );
}
