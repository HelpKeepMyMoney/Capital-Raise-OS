"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatVariant = "default" | "success" | "danger" | "gold";

export function StatCard(props: {
  title: string;
  value: string;
  hint?: string;
  delay?: number;
  href?: string;
  variant?: StatVariant;
}) {
  const variant = props.variant ?? "default";
  const accent =
    variant === "success"
      ? "border-success/30 shadow-sm shadow-success/10"
      : variant === "danger"
        ? "border-destructive/35 shadow-sm shadow-destructive/10"
        : variant === "gold"
          ? "border-warning/40 shadow-sm shadow-warning/15"
          : "border-border/80 shadow-md shadow-black/5";

  const content = (
    <Card
      className={cn(
        "rounded-2xl border bg-card transition-all",
        accent,
        props.href && "cursor-pointer hover:border-primary/30 hover:shadow-lg",
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {props.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-3xl font-semibold tracking-tight text-card-foreground">{props.value}</p>
        {props.hint ? <p className="mt-1.5 text-xs text-muted-foreground">{props.hint}</p> : null}
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: props.delay ?? 0 }}
    >
      {props.href ? (
        <Link href={props.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
          {content}
        </Link>
      ) : (
        content
      )}
    </motion.div>
  );
}
