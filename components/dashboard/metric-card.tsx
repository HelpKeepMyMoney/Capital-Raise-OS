"use client";

import * as React from "react";
import Link from "next/link";
import { animate, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type MetricTrend = {
  direction: "up" | "down" | "flat";
  label: string;
};

function parsePlainNumber(s: string): number | null {
  const t = s.replace(/[$,\s]/g, "").trim();
  if (t === "" || t === "—") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function CountUpNumber(props: { value: string }) {
  const raw = props.value;
  const prefix = raw.startsWith("$") ? "$" : "";
  const n = parsePlainNumber(raw);
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (n == null) return;
    const controls = animate(0, n, {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [n]);

  if (n == null) {
    return <>{raw}</>;
  }
  return (
    <>
      {prefix}
      {display.toLocaleString()}
    </>
  );
}

export type MetricVariant = "default" | "success" | "danger" | "gold";

export function MetricCard(props: {
  title: string;
  value: string;
  micro?: string;
  icon: LucideIcon;
  delay?: number;
  href?: string;
  variant?: MetricVariant;
  trend?: MetricTrend | null;
}) {
  const variant = props.variant ?? "default";
  const accent =
    variant === "success"
      ? "border-success/25 shadow-sm shadow-success/8"
      : variant === "danger"
        ? "border-destructive/30 shadow-sm shadow-destructive/10"
        : variant === "gold"
          ? "border-warning/35 shadow-sm shadow-warning/12"
          : "border-border/80 shadow-md shadow-black/[0.04]";

  const Icon = props.icon;
  const numeric = parsePlainNumber(props.value) != null && !props.value.includes(".");

  const trendEl =
    props.trend != null ? (
      <div className="mt-2 flex items-center gap-1 text-xs font-medium">
        {props.trend.direction === "up" ? (
          <ArrowUpRight className="size-3.5 text-success" aria-hidden />
        ) : props.trend.direction === "down" ? (
          <ArrowDownRight className="size-3.5 text-destructive" aria-hidden />
        ) : (
          <Minus className="size-3.5 text-muted-foreground" aria-hidden />
        )}
        <span
          className={cn(
            props.trend.direction === "up" && "text-success",
            props.trend.direction === "down" && "text-destructive",
            props.trend.direction === "flat" && "text-muted-foreground",
          )}
        >
          {props.trend.label}
        </span>
      </div>
    ) : null;

  const content = (
    <Card
      className={cn(
        "group h-full rounded-2xl border bg-card transition-all duration-200",
        accent,
        props.href && "cursor-pointer hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {props.title}
            </p>
            <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight text-card-foreground md:text-[2rem]">
              {numeric ? <CountUpNumber value={props.value} /> : props.value}
            </p>
            {trendEl}
            {props.micro ? (
              <p className="pt-1 text-xs leading-snug text-muted-foreground">{props.micro}</p>
            ) : null}
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-primary transition-colors group-hover:border-primary/25 group-hover:bg-primary/5">
            <Icon className="size-4 opacity-90" aria-hidden />
          </div>
        </div>
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
