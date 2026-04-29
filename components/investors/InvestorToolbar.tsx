"use client";

import * as React from "react";
import {
  Bookmark,
  Download,
  PencilLine,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { InvestorType, PipelineStage, WarmCold } from "@/lib/firestore/types";
import {
  FILTER_UNSET,
  type InvestorToolbarState,
  type LastActivityFilter,
} from "@/lib/investors/investor-toolbar-types";
import { INVESTOR_TYPE_OPTIONS, PIPELINE_STAGES, pipelineStageLabel } from "@/lib/investors/form-options";
import type { OrganizationMemberPublic } from "@/lib/firestore/queries";

export type { InvestorToolbarState, LastActivityFilter };

export function InvestorToolbar(props: {
  state: InvestorToolbarState;
  onChange: (patch: Partial<InvestorToolbarState>) => void;
  members: OrganizationMemberPublic[];
  deals: { id: string; name: string }[];
  savedPresets: { id: string; name: string }[];
  onSavePreset: (name: string) => void;
  onApplyPreset: (id: string) => void;
  onDeletePreset?: (id: string) => void;
  onClearFilters: () => void;
  filtersActive: boolean;
  onExportCsv: () => void;
  onBulkEdit?: () => void;
  onNewInvestor: () => void;
  canManage: boolean;
  className?: string;
}) {
  const [presetName, setPresetName] = React.useState("");
  const s = props.state;

  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-1 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/90 px-4 py-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-card/75 md:flex-row md:items-center md:justify-between",
        props.className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-[200px] flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={s.search}
            onChange={(e) => props.onChange({ search: e.target.value })}
            placeholder="Search investors, firms, notes…"
            className="h-10 rounded-xl border-border/80 bg-background pl-9 pr-8 shadow-inner"
          />
          {s.search ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => props.onChange({ search: "" })}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl border border-border/80 bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted/40",
              )}
            >
              <Bookmark className="size-4 opacity-70" />
              Saved filters
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {props.savedPresets.length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">No saved views yet.</p>
              ) : (
                props.savedPresets.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => props.onApplyPreset(p.id)}>
                    {p.name}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <div className="space-y-2 p-2">
                <Label className="text-xs">Save current filters</Label>
                <div className="flex gap-2">
                  <Input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="View name"
                    className="h-8"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      const n = presetName.trim();
                      if (!n) return;
                      props.onSavePreset(n);
                      setPresetName("");
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select
            value={s.filterStage}
            onValueChange={(v) => props.onChange({ filterStage: v as PipelineStage | "all" })}
          >
            <SelectTrigger className="h-10 w-[140px] rounded-xl border-border/80 bg-background shadow-sm">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Stage · All</SelectItem>
              {PIPELINE_STAGES.map((st) => (
                <SelectItem key={st} value={st}>
                  {pipelineStageLabel(st)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={s.filterType}
            onValueChange={(v) =>
              props.onChange({ filterType: v as InvestorType | "all" | typeof FILTER_UNSET })
            }
          >
            <SelectTrigger className="h-10 w-[148px] rounded-xl border-border/80 bg-background shadow-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Type · All</SelectItem>
              <SelectItem value={FILTER_UNSET}>Type · Not set</SelectItem>
              {INVESTOR_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={s.filterWarmth}
            onValueChange={(v) =>
              props.onChange({ filterWarmth: v as WarmCold | "all" | typeof FILTER_UNSET })
            }
          >
            <SelectTrigger className="h-10 w-[136px] rounded-xl border-border/80 bg-background shadow-sm">
              <SelectValue placeholder="Warmth" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Warmth · All</SelectItem>
              <SelectItem value={FILTER_UNSET}>Warmth · Not set</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={(s.filterOwnerUserId ?? "all") as string}
            onValueChange={(v) =>
              props.onChange({ filterOwnerUserId: v == null ? "all" : v })
            }
          >
            <SelectTrigger className="h-10 w-[160px] rounded-xl border-border/80 bg-background shadow-sm">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Owner · All</SelectItem>
              <SelectItem value="__unassigned__">Owner · Unassigned</SelectItem>
              {props.members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.displayName ?? m.email ?? m.userId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm hover:bg-muted/40">
              <SlidersHorizontal className="size-4 opacity-70" />
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 p-3">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Check size</Label>
                  <Select
                    value={s.filterCheck}
                    onValueChange={(v) =>
                      props.onChange({
                        filterCheck: v as InvestorToolbarState["filterCheck"],
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="25k_100k">$25K – $100K</SelectItem>
                      <SelectItem value="100k_500k">$100K – $500K</SelectItem>
                      <SelectItem value="500k_1m">$500K – $1M</SelectItem>
                      <SelectItem value="1m_plus">$1M+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last activity</Label>
                  <Select
                    value={s.filterLastActivity}
                    onValueChange={(v) =>
                      props.onChange({ filterLastActivity: v as LastActivityFilter })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="d7">Within 7 days</SelectItem>
                      <SelectItem value="d30">Within 30 days</SelectItem>
                      <SelectItem value="d90">Within 90 days</SelectItem>
                      <SelectItem value="never">Never logged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Interested deal</Label>
                  <Select
                    value={(s.filterDealId ?? "all") as string}
                    onValueChange={(v) =>
                      props.onChange({ filterDealId: v == null ? "all" : v })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any deal</SelectItem>
                      {props.deals.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {props.filtersActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl text-muted-foreground"
              onClick={props.onClearFilters}
            >
              Reset filters
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border/40 pt-3 md:border-t-0 md:pt-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 rounded-xl border-border/80"
          onClick={props.onExportCsv}
        >
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
        {props.canManage ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 rounded-xl border-border/80"
              onClick={props.onBulkEdit}
            >
              <PencilLine className="mr-2 size-4" />
              Bulk edit
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-10 rounded-xl bg-primary px-4 shadow-sm"
              onClick={props.onNewInvestor}
            >
              <Plus className="mr-2 size-4" />
              New Investor
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
