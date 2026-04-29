"use client";

import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InvestorHeader(props: {
  canManage: boolean;
  onAddInvestor: () => void;
  onImportCsv?: () => void;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-6 border-b border-border/60 pb-8 lg:flex-row lg:items-start lg:justify-between",
        props.className,
      )}
    >
      <div className="max-w-2xl space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Investor CRM
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground md:text-[15px]">
          Relationship intelligence for private capital. Track pipeline, ownership, momentum, and
          commitments in one workspace.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {props.canManage ? (
          <>
            <Button
              size="lg"
              className="rounded-xl px-5 shadow-sm transition-all hover:shadow-md"
              onClick={props.onAddInvestor}
            >
              Add Investor
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl border-border/80 bg-card px-4 shadow-sm hover:bg-muted/40"
              type="button"
              onClick={props.onImportCsv}
            >
              <Upload className="mr-2 size-4" />
              Import CSV
            </Button>
            <Link
              href="/outreach"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-xl border-border/80 bg-card px-4 shadow-sm hover:bg-muted/40 inline-flex items-center gap-2",
              )}
            >
              Send Outreach
              <ArrowRight className="size-4 opacity-70" />
            </Link>
          </>
        ) : null}
      </div>
    </header>
  );
}
