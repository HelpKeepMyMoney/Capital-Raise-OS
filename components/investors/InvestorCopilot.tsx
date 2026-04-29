"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Investor } from "@/lib/firestore/types";
import { investorLastFirstName } from "@/lib/investors/display-name";
import { investorRelationshipHeat } from "@/components/investors/InvestorCard";

const PROMPTS = [
  "Who is most likely to invest this month?",
  "Which leads are stale?",
  "Draft follow-ups for warm investors",
  "Summarize this investor relationship",
  "Rank top 10 prospects",
  "Show hidden opportunities",
] as const;

export function InvestorCopilot(props: {
  investors: Investor[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [reply, setReply] = React.useState<string | null>(null);

  function runInsight(prompt: string) {
    setQuery(prompt);
    const inv = props.investors;
    const stale = inv.filter((i) => investorRelationshipHeat(i) === "stale");
    const hot = [...inv]
      .filter((i) => (i.relationshipScore ?? 0) >= 70)
      .sort((a, b) => (b.relationshipScore ?? 0) - (a.relationshipScore ?? 0))
      .slice(0, 10);

    let text = "";
    if (prompt.includes("stale")) {
      text =
        stale.length === 0
          ? "No stale leads detected at the moment — keep logging touchpoints."
          : `Stale (${stale.length}): ${stale
            .slice(0, 8)
            .map((i) => investorLastFirstName(i))
            .join(", ")}${stale.length > 8 ? "…" : ""}`;
    } else if (prompt.includes("Rank") || prompt.includes("prospects")) {
      text =
        hot.length === 0
          ? "Add scores to investors to rank conviction-weighted prospects."
          : `Top prospects by score: ${hot.map((i) => `${investorLastFirstName(i)} (${i.relationshipScore})`).join("; ")}`;
    } else if (prompt.includes("likely")) {
      const warm = inv.filter((i) => i.warmCold === "warm").length;
      text = `Warm contacts in pipeline: ${warm}. Pair with next follow-up discipline for highest closing probability this month.`;
    } else {
      text =
        "Insights run locally on your CRM slice — connect AI chat from the main workspace for drafted outreach copy.";
    }
    setReply(text);
  }

  return (
    <div className={cn("fixed bottom-6 right-6 z-40 flex max-w-[380px] flex-col items-end gap-2", props.className)}>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span className="text-sm font-semibold">Investor copilot</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-lg"
                onClick={() => setOpen(false)}
                aria-label="Close copilot"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap gap-1.5">
                {PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => runInsight(p)}
                    className="rounded-full border border-border/70 bg-muted/20 px-2.5 py-1 text-[11px] font-medium leading-snug text-foreground transition-colors hover:bg-muted/50"
                  >
                    {p}
                  </button>
                ))}
              </div>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about your pipeline…"
                rows={2}
                className="resize-none rounded-xl border-border/80 text-sm"
              />
              <Button type="button" size="sm" className="w-full rounded-xl" onClick={() => runInsight(query)}>
                Generate insight
              </Button>
              {reply ? (
                <p className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-foreground">
                  {reply}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Shortcuts use your current filters. Pair with org AI chat for email drafts.
                </p>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {!open ? (
        <Button
          type="button"
          size="lg"
          className="h-12 rounded-full px-5 shadow-lg"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="mr-2 size-4" />
          Copilot
        </Button>
      ) : null}
    </div>
  );
}
