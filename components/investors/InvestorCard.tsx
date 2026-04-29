"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  ExternalLink,
  GripVertical,
  MoreHorizontal,
  StickyNote,
  ArrowRightLeft,
} from "lucide-react";
import type { Investor, PipelineStage } from "@/lib/firestore/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { investorSegmentLabel, checkSizeHint } from "@/lib/investors/crm-labels";
import { investorLastFirstName } from "@/lib/investors/display-name";
import { PIPELINE_STAGES, pipelineStageShortLabel } from "@/lib/investors/form-options";

export type Heat = "hot" | "stale" | "overdue" | "neutral";

export function investorRelationshipHeat(inv: Investor): Heat {
  const now = Date.now();
  if (inv.nextFollowUpAt != null && inv.nextFollowUpAt < now) return "overdue";
  const last = inv.lastContactAt ?? inv.updatedAt;
  if (now - last > 14 * 86400000) return "stale";
  if ((inv.relationshipScore ?? 0) >= 80) return "hot";
  return "neutral";
}

function initials(inv: Investor): string {
  const f = inv.firstName?.charAt(0) ?? "";
  const l = inv.lastName?.charAt(0) ?? "";
  const x = (f + l).trim();
  if (x) return x.toUpperCase().slice(0, 2);
  return inv.name.slice(0, 2).toUpperCase();
}

export function InvestorCard(props: {
  investor: Investor;
  canManage: boolean;
  ownerLabel: string;
  onStageChange: (id: string, stage: PipelineStage) => void;
  onArchive: (id: string, archived: boolean) => void;
  onNoteQuick?: (inv: Investor) => void;
}) {
  const router = useRouter();
  const inv = props.investor;
  const heat = investorRelationshipHeat(inv);
  const ring =
    heat === "overdue"
      ? "border-l-red-500"
      : heat === "stale"
        ? "border-l-amber-500"
        : heat === "hot"
          ? "border-l-emerald-500"
          : "border-l-transparent";

  return (
    <div
      draggable={props.canManage}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/investor-id", inv.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group/card rounded-2xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        "border-l-4",
        ring,
      )}
    >
      <div className="flex items-start gap-2 p-3 pb-2">
        <Avatar className="size-9 shrink-0 border border-border/60">
          <AvatarFallback className="bg-muted text-xs font-semibold">{initials(inv)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <Link
                href={`/investors/${inv.id}`}
                className="block truncate font-semibold leading-tight tracking-tight text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {investorLastFirstName(inv)}
              </Link>
              {inv.firm ? (
                <p className="truncate text-xs text-muted-foreground">{inv.firm}</p>
              ) : null}
            </div>
            {props.canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    "shrink-0 opacity-70 hover:opacity-100",
                  )}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => router.push(`/investors/${inv.id}`)}>
                    Open profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => props.onArchive(inv.id, inv.crmStatus !== "archived")}>
                    {inv.crmStatus === "archived" ? "Restore" : "Archive"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Move to stage</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                      {PIPELINE_STAGES.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          disabled={s === inv.pipelineStage}
                          onClick={() => props.onStageChange(inv.id, s)}
                        >
                          {pipelineStageShortLabel(s)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px] font-medium">
              {investorSegmentLabel(inv)}
            </Badge>
            {inv.investorType ? (
              <Badge variant="outline" className="text-[10px] capitalize">
                {inv.investorType.replace(/_/g, " ")}
              </Badge>
            ) : null}
            {inv.warmCold ? (
              <Badge variant="outline" className="text-[10px] capitalize">
                {inv.warmCold}
              </Badge>
            ) : null}
            {inv.relationshipScore != null ? (
              <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
                {inv.relationshipScore}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-1 px-3 pb-2 text-[11px] text-muted-foreground">
        {checkSizeHint(inv) ? (
          <p>
            <span className="text-foreground/80">Check </span>
            {checkSizeHint(inv)}
          </p>
        ) : null}
        {inv.investProbability != null ? (
          <p className="font-medium text-foreground">
            P(close) {inv.investProbability}%
          </p>
        ) : null}
        {inv.lastContactAt ? (
          <p>Last touch {formatDistanceToNow(inv.lastContactAt, { addSuffix: true })}</p>
        ) : (
          <p>No logged touchpoint yet</p>
        )}
        {inv.nextFollowUpAt ? (
          <p
            className={cn(
              heat === "overdue" ? "font-medium text-red-600 dark:text-red-400" : "text-primary",
            )}
          >
            Next follow-up {formatDistanceToNow(inv.nextFollowUpAt, { addSuffix: true })}
          </p>
        ) : null}
        <p className="text-muted-foreground">Owner · {props.ownerLabel}</p>
        {inv.crmStatus === "archived" ? (
          <Badge variant="outline" className="mt-1 text-[10px]">
            Archived
          </Badge>
        ) : null}
      </div>

      <div className="flex gap-1 border-t border-border/60 bg-muted/20 px-2 py-2">
        <Link
          href={`/investors/${inv.id}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "inline-flex h-8 flex-1 items-center justify-center rounded-lg text-xs",
          )}
        >
          <ExternalLink className="mr-1 size-3.5 opacity-70" />
          View
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 flex-1 rounded-lg text-xs"
          type="button"
          onClick={() => props.onNoteQuick?.(inv)}
        >
          <StickyNote className="mr-1 size-3.5 opacity-70" />
          Note
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "inline-flex h-8 flex-1 items-center justify-center rounded-lg text-xs",
            )}
          >
            <ArrowRightLeft className="mr-1 size-3.5 opacity-70" />
            Move
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
            {PIPELINE_STAGES.map((s) => (
              <DropdownMenuItem
                key={s}
                disabled={!props.canManage || s === inv.pipelineStage}
                onClick={() => props.onStageChange(inv.id, s)}
              >
                {pipelineStageShortLabel(s)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {props.canManage ? (
        <div className="flex items-center justify-center border-t border-dashed border-border/50 py-1 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100">
          <GripVertical className="mr-1 size-3" />
          Drag to another column
        </div>
      ) : null}
    </div>
  );
}
