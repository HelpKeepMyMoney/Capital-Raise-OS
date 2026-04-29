"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { UserPlus, FileStack, Send } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const outlinePremium = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "h-9 gap-1.5 rounded-full border-border/80 bg-card px-4 shadow-sm transition-all hover:border-primary/30 hover:bg-card hover:shadow-md",
);

const primaryPremium = cn(
  buttonVariants({ variant: "default", size: "sm" }),
  "h-9 gap-1.5 rounded-full px-4 shadow-sm shadow-primary/20 transition-all hover:opacity-95",
);

export function DashboardHeader(props: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between",
        props.className,
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="min-w-0 space-y-2"
      >
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Capital Command Center
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Live view of pipeline, commitments, investor momentum, and priorities.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="flex flex-shrink-0 flex-wrap gap-2"
      >
        <Link href="/investors?add=1" className={outlinePremium}>
          <UserPlus className="size-3.5 opacity-80" />
          New Investor
        </Link>
        <Link href="/deals/new" className={outlinePremium}>
          <FileStack className="size-3.5 opacity-80" />
          New Deal
        </Link>
        <Link href="/outreach" className={primaryPremium}>
          <Send className="size-3.5 opacity-90" />
          Send Outreach
        </Link>
      </motion.div>
    </div>
  );
}
