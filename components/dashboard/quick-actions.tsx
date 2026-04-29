"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  UserPlus,
  FileStack,
  Upload,
  Send,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCopilotUI } from "@/components/copilot-ui-context";

const actions = [
  { label: "Add Investor", href: "/investors?add=1", icon: UserPlus },
  { label: "Create Offering", href: "/deals/new", icon: FileStack },
  { label: "Upload Deck", href: "/data-room", icon: Upload },
  { label: "Send Follow Ups", href: "/outreach", icon: Send },
  { label: "Weekly Report", href: "/analytics", icon: BarChart3 },
] as const;

export function QuickActions() {
  const { openCopilot } = useCopilotUI();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
    >
      <Card className="rounded-2xl border-border/80 bg-card shadow-md transition-shadow duration-200 hover:shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base font-semibold">Quick actions</CardTitle>
          <p className="text-xs text-muted-foreground">Shortcuts to the highest-leverage workflows.</p>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {actions.map((a, i) => (
              <motion.li
                key={a.href}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.03 }}
              >
                <Link
                  href={a.href}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-muted/20 px-3 py-4 text-center text-xs font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-md",
                  )}
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <a.icon className="size-4" aria-hidden />
                  </span>
                  {a.label}
                </Link>
              </motion.li>
            ))}
            <motion.li
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + actions.length * 0.03 }}
              className="col-span-2 sm:col-span-1"
            >
              <button
                type="button"
                onClick={() => openCopilot()}
                className={cn(
                  "flex w-full flex-col items-center gap-2 rounded-2xl border border-primary/25 bg-primary/5 px-3 py-4 text-center text-xs font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:shadow-md",
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                Ask AI Copilot
              </button>
            </motion.li>
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}
