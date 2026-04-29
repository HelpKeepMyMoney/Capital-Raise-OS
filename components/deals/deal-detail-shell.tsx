"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDealPageViewTelemetry } from "@/components/deals/deal-telemetry";

export function DealDetailShell(props: {
  dealId: string;
  guest: boolean;
  children: React.ReactNode;
}) {
  const [showSticky, setShowSticky] = React.useState(false);

  useDealPageViewTelemetry(props.dealId, true);

  React.useEffect(() => {
    const el = document.getElementById("deal-hero-anchor");
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        setShowSticky(!e?.isIntersecting);
      },
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative pb-24">
      {props.children}
      <AnimatePresence>
        {props.guest && showSticky ? (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card/95 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
              <p className="hidden text-sm font-medium sm:block">Ready to move forward?</p>
              <Link
                href="#commit"
                className={cn(buttonVariants({ size: "lg" }), "w-full rounded-xl sm:w-auto")}
              >
                <Wallet className="mr-2 size-5" />
                Commit capital
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
