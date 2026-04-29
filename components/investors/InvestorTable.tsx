"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import type { Investor, PipelineStage, WarmCold } from "@/lib/firestore/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  compareInvestorsByLastFirst,
  investorLastFirstName,
} from "@/lib/investors/display-name";
import { checkSizeHint } from "@/lib/investors/crm-labels";
import { PIPELINE_STAGES, pipelineStageLabel } from "@/lib/investors/form-options";
import type { OrganizationMemberPublic } from "@/lib/firestore/queries";

const PAGE_SIZE = 25;

const STAGE_SORT_INDEX = new Map(PIPELINE_STAGES.map((s, i) => [s, i] as const));

export type InvestorTableSortKey =
  | "name"
  | "firm"
  | "stage"
  | "type"
  | "warmth"
  | "score"
  | "probability"
  | "check"
  | "owner"
  | "lastActivity"
  | "nextFollowUp"
  | "committed";

function midCheck(inv: Investor): number | null {
  if (inv.checkSizeMin != null && inv.checkSizeMax != null)
    return (inv.checkSizeMin + inv.checkSizeMax) / 2;
  return inv.checkSizeMax ?? inv.checkSizeMin ?? null;
}

function compareRows(
  a: Investor,
  b: Investor,
  key: InvestorTableSortKey,
  dir: 1 | -1,
): number {
  const mul = dir;
  switch (key) {
    case "name":
      return compareInvestorsByLastFirst(a, b) * mul;
    case "firm": {
      const af = (a.firm ?? "").toLowerCase();
      const bf = (b.firm ?? "").toLowerCase();
      if (af !== bf) return af.localeCompare(bf) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "stage": {
      const ai = STAGE_SORT_INDEX.get(a.pipelineStage) ?? 999;
      const bi = STAGE_SORT_INDEX.get(b.pipelineStage) ?? 999;
      if (ai !== bi) return (ai - bi) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "type": {
      const at = (a.investorType ?? "").toLowerCase();
      const bt = (b.investorType ?? "").toLowerCase();
      if (at !== bt) return at.localeCompare(bt) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "warmth": {
      const rank = (w: WarmCold | undefined) => (w === "warm" ? 0 : w === "cold" ? 1 : 2);
      const ar = rank(a.warmCold);
      const br = rank(b.warmCold);
      if (ar !== br) return (ar - br) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "score": {
      const ar = a.relationshipScore ?? -1;
      const br = b.relationshipScore ?? -1;
      if (ar !== br) return (ar - br) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "probability": {
      const ar = a.investProbability ?? -1;
      const br = b.investProbability ?? -1;
      if (ar !== br) return (ar - br) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "check": {
      const am = midCheck(a) ?? -1;
      const bm = midCheck(b) ?? -1;
      if (am !== bm) return (am - bm) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "owner": {
      const ao = a.relationshipOwnerUserId ?? "";
      const bo = b.relationshipOwnerUserId ?? "";
      if (ao !== bo) return ao.localeCompare(bo) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "lastActivity": {
      const aa = a.lastContactAt ?? a.updatedAt;
      const bb = b.lastContactAt ?? b.updatedAt;
      if (aa !== bb) return (aa - bb) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "nextFollowUp": {
      const aa = a.nextFollowUpAt ?? Number.MAX_SAFE_INTEGER;
      const bb = b.nextFollowUpAt ?? Number.MAX_SAFE_INTEGER;
      if (aa !== bb) return (aa - bb) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "committed": {
      const aa = a.committedAmount ?? -1;
      const bb = b.committedAmount ?? -1;
      if (aa !== bb) return (aa - bb) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    default:
      return 0;
  }
}

function SortHead(props: {
  label: string;
  column: InvestorTableSortKey;
  sortKey: InvestorTableSortKey;
  sortDir: "asc" | "desc";
  onSort: (c: InvestorTableSortKey) => void;
  className?: string;
}) {
  const active = props.sortKey === props.column;
  return (
    <TableHead className={cn("whitespace-nowrap bg-card", props.className)}>
      <button
        type="button"
        className={cn(
          "-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left text-xs font-semibold hover:bg-muted/80",
          active ? "text-foreground" : "text-muted-foreground",
        )}
        onClick={() => props.onSort(props.column)}
      >
        {props.label}
        {active ? (
          props.sortDir === "asc" ? (
            <ArrowUp className="size-3 shrink-0 opacity-70" />
          ) : (
            <ArrowDown className="size-3 shrink-0 opacity-70" />
          )
        ) : null}
      </button>
    </TableHead>
  );
}

export function InvestorTable(props: {
  investors: Investor[];
  members: OrganizationMemberPublic[];
  deals: { id: string; name: string }[];
  canManage: boolean;
  selectedIds: Set<string>;
  onSelectedIdsChange: (next: Set<string>) => void;
  onStageChange: (id: string, stage: PipelineStage) => void;
  onArchive: (id: string, archived: boolean) => void;
  className?: string;
}) {
  const [sortKey, setSortKey] = React.useState<InvestorTableSortKey>("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(0);

  const sorted = React.useMemo(() => {
    const mul = sortDir === "asc" ? 1 : -1;
    return [...props.investors].sort((a, b) => compareRows(a, b, sortKey, mul));
  }, [props.investors, sortKey, sortDir]);

  React.useEffect(() => {
    setPage(0);
  }, [props.investors.length, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function ownerLabel(uid: string | undefined) {
    if (!uid) return "—";
    const mem = props.members.find((x) => x.userId === uid);
    return mem?.displayName ?? mem?.email ?? uid.slice(0, 6) + "…";
  }

  function toggleSort(c: InvestorTableSortKey) {
    if (sortKey === c) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(c);
      setSortDir("asc");
    }
  }

  const allSelected = slice.length > 0 && slice.every((r) => props.selectedIds.has(r.id));

  function toggleAllVisible() {
    const next = new Set(props.selectedIds);
    if (allSelected) {
      for (const r of slice) next.delete(r.id);
    } else {
      for (const r of slice) next.add(r.id);
    }
    props.onSelectedIdsChange(next);
  }

  function toggleOne(id: string) {
    const next = new Set(props.selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    props.onSelectedIdsChange(next);
  }

  return (
    <div className={cn("space-y-3", props.className)}>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-20 w-10 bg-card shadow-[2px_0_8px_-4px_rgba(0,0,0,0.08)]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => toggleAllVisible()}
                    aria-label="Select page"
                  />
                </TableHead>
                <SortHead
                  label="Name"
                  column="name"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="sticky left-10 z-20 min-w-[160px] bg-card pl-0 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.08)]"
                />
                <SortHead
                  label="Firm"
                  column="firm"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[120px]"
                />
                <SortHead
                  label="Stage"
                  column="stage"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[120px]"
                />
                <SortHead
                  label="Type"
                  column="type"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[96px]"
                />
                <SortHead
                  label="Warmth"
                  column="warmth"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[88px]"
                />
                <SortHead
                  label="Score"
                  column="score"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[72px]"
                />
                <SortHead
                  label="P(close)"
                  column="probability"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[72px]"
                />
                <SortHead
                  label="Check size"
                  column="check"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[110px]"
                />
                <SortHead
                  label="Owner"
                  column="owner"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[120px]"
                />
                <SortHead
                  label="Last activity"
                  column="lastActivity"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[120px]"
                />
                <SortHead
                  label="Next follow-up"
                  column="nextFollowUp"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[120px]"
                />
                <SortHead
                  label="Committed"
                  column="committed"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[100px]"
                />
                <TableHead className="min-w-[140px] text-xs font-semibold">Interested deals</TableHead>
                <TableHead className="w-[100px] text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={17} className="h-28 text-center text-sm text-muted-foreground">
                    No investors match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                slice.map((inv) => (
                  <TableRow key={inv.id} className="group">
                    <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted/30">
                      <Checkbox
                        checked={props.selectedIds.has(inv.id)}
                        onCheckedChange={() => toggleOne(inv.id)}
                        aria-label={`Select ${investorLastFirstName(inv)}`}
                      />
                    </TableCell>
                    <TableCell className="sticky left-10 z-10 min-w-[160px] bg-card font-medium group-hover:bg-muted/30">
                      <Link
                        href={`/investors/${inv.id}`}
                        className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {investorLastFirstName(inv)}
                      </Link>
                      {inv.crmStatus === "archived" ? (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          Archived
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">{inv.firm ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={inv.pipelineStage}
                        disabled={!props.canManage}
                        onValueChange={(v) => props.onStageChange(inv.id, v as PipelineStage)}
                      >
                        <SelectTrigger className="h-8 w-[150px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PIPELINE_STAGES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {pipelineStageLabel(st)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{inv.investorType?.replace(/_/g, " ") ?? "—"}</TableCell>
                    <TableCell className="text-sm capitalize">{inv.warmCold ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {inv.relationshipScore ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {inv.investProbability != null ? `${inv.investProbability}%` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{checkSizeHint(inv) ?? "—"}</TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs">{ownerLabel(inv.relationshipOwnerUserId)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(inv.lastContactAt ?? inv.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {inv.nextFollowUpAt
                        ? new Date(inv.nextFollowUpAt).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {inv.committedAmount != null ? `$${inv.committedAmount.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="max-w-[180px] text-xs">
                      {inv.interestedDealIds?.length ? (
                        <span className="line-clamp-2">
                          {inv.interestedDealIds
                            .map((id) => props.deals.find((d) => d.id === id)?.name ?? id)
                            .join(", ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/investors/${inv.id}`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1 text-xs")}
                        >
                          <ExternalLink className="size-3.5" />
                          View
                        </Link>
                        {props.canManage ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                            >
                              <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => props.onArchive(inv.id, inv.crmStatus !== "archived")}>
                                {inv.crmStatus === "archived" ? "Restore" : "Archive"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>
          Showing {sorted.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–
          {Math.min(sorted.length, (safePage + 1) * PAGE_SIZE)} of {sorted.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-mono tabular-nums">
            {safePage + 1} / {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
