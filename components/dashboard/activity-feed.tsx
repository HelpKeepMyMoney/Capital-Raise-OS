"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Activity } from "@/lib/firestore/types";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  GitBranch,
  HandCoins,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";

export type ActivityFilter = "all" | "investors" | "deals" | "docs";

function activityIcon(a: Activity) {
  const t = (a.type ?? "").toLowerCase();
  const s = (a.summary ?? "").toLowerCase();
  if (t.includes("commit") || s.includes("commitment")) return HandCoins;
  if (t.includes("data_room") || t.includes("deal_room") || s.includes("data room")) return FileText;
  if (t.includes("meeting") || s.includes("meeting")) return Phone;
  if (t.includes("stage") || s.includes("stage")) return GitBranch;
  if (t.includes("email") || t.includes("outreach")) return MessageCircle;
  return Sparkles;
}

function activityMatchesFilter(a: Activity, f: ActivityFilter): boolean {
  if (f === "all") return true;
  const t = (a.type ?? "").toLowerCase();
  const s = (a.summary ?? "").toLowerCase();
  if (f === "investors") {
    return (
      a.investorId != null ||
      t.includes("investor") ||
      /lp|prospect|investor/i.test(a.summary)
    );
  }
  if (f === "deals") {
    return (
      t.includes("deal") ||
      s.includes("deal") ||
      s.includes("offering") ||
      s.includes("syndication")
    );
  }
  if (f === "docs") {
    return (
      t.includes("doc") ||
      t.includes("room") ||
      t.includes("deck") ||
      s.includes("deck") ||
      s.includes("document") ||
      s.includes("data room")
    );
  }
  return true;
}

export function ActivityFeed(props: { items: Activity[] }) {
  const [filter, setFilter] = React.useState<ActivityFilter>("all");
  const filtered = React.useMemo(
    () => props.items.filter((a) => activityMatchesFilter(a, filter)),
    [props.items, filter],
  );

  const tabs: { id: ActivityFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "investors", label: "Investors" },
    { id: "deals", label: "Deals" },
    { id: "docs", label: "Docs" },
  ];

  return (
    <Card className="rounded-2xl border-border/80 bg-card font-heading shadow-md transition-shadow duration-200 hover:shadow-lg">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Recent investor activity</CardTitle>
          <div className="flex flex-wrap gap-1 rounded-full border border-border/70 bg-muted/30 p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  filter === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {props.items.length === 0 ? "No recent activity." : "Nothing in this filter."}
          </p>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((a, i) => {
              const Icon = activityIcon(a);
              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2.5 shadow-sm transition-shadow hover:border-border hover:shadow-md"
                >
                  <div className="flex gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      {a.investorId ? (
                        <Link
                          href={`/investors/${a.investorId}`}
                          className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
                        >
                          {a.summary}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-foreground">{a.summary}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(a.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
