"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { OutreachInvestorOption } from "@/lib/outreach/audience";
import { cn } from "@/lib/utils";

const MAX_PICK = 500;

export function CampaignInvestorPicker(props: {
  investors?: OutreachInvestorOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const investors = props.investors ?? [];
  const selectedIds = props.selectedIds ?? [];
  const [query, setQuery] = React.useState("");
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...investors].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter((inv) => {
      const hay = `${inv.name} ${inv.firm ?? ""} ${inv.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [investors, query]);

  const selectedInvestors = React.useMemo(
    () =>
      selectedIds
        .map((id) => investors.find((i) => i.id === id))
        .filter((i): i is OutreachInvestorOption => Boolean(i)),
    [selectedIds, investors],
  );

  const eligibleIds = React.useMemo(
    () => new Set(investors.filter((i) => i.email?.trim()).map((i) => i.id)),
    [investors],
  );

  const missingEmailCount = selectedIds.filter((id) => !eligibleIds.has(id)).length;

  function toggle(id: string) {
    if (props.disabled) return;
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
    } else if (next.size < MAX_PICK) {
      next.add(id);
    }
    props.onChange([...next]);
  }

  function remove(id: string) {
    props.onChange(selectedIds.filter((x) => x !== id));
  }

  function selectVisible() {
    const ids = new Set(selectedIds);
    for (const inv of filtered) {
      if (ids.size >= MAX_PICK) break;
      if (inv.email?.trim()) ids.add(inv.id);
    }
    props.onChange([...ids]);
  }

  function clearAll() {
    props.onChange([]);
  }

  return (
    <div className="space-y-3">
      <PickerToolbar
        query={query}
        onQueryChange={setQuery}
        disabled={props.disabled}
        filteredLength={filtered.length}
        selectedLength={selectedIds.length}
        onSelectVisible={selectVisible}
        onClearAll={clearAll}
      />

      {selectedInvestors.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedInvestors.map((inv) => (
            <Badge key={inv.id} variant="secondary" className="gap-1 pr-1 font-normal">
              <span>{inv.name}</span>
              {!inv.email?.trim() ? (
                <span className="text-[10px] text-amber-700 dark:text-amber-400">no email</span>
              ) : null}
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                disabled={props.disabled}
                aria-label={`Remove ${inv.name}`}
                onClick={() => remove(inv.id)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {selectedIds.length} selected
        {selectedIds.length >= MAX_PICK ? ` (max ${MAX_PICK})` : ""}
        {missingEmailCount > 0
          ? ` · ${missingEmailCount} without email will be skipped at launch`
          : ""}
      </p>

      <div
        className={cn(
          "max-h-56 overflow-y-auto rounded-lg border border-border/80 bg-background",
          props.disabled && "pointer-events-none opacity-60",
        )}
      >
        {investors.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No investors in CRM yet. Add contacts under Investor CRM first.
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No investors match.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((inv) => {
              const hasEmail = Boolean(inv.email?.trim());
              const checked = selectedSet.has(inv.id);
              return (
                <li key={inv.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/40",
                      !hasEmail && "opacity-70",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={props.disabled || (!checked && selectedIds.length >= MAX_PICK)}
                      onCheckedChange={() => toggle(inv.id)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-snug">{inv.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[inv.firm, inv.email || "No email on file"].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function PickerToolbar(props: {
  query: string;
  onQueryChange: (q: string) => void;
  disabled?: boolean;
  filteredLength: number;
  selectedLength: number;
  onSelectVisible: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={props.query}
          onChange={(e) => props.onQueryChange(e.target.value)}
          placeholder="Search by name, firm, or email…"
          className="h-9 pl-9"
          disabled={props.disabled}
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={props.disabled || props.filteredLength === 0}
        onClick={props.onSelectVisible}
      >
        Add visible
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={props.disabled || props.selectedLength === 0}
        onClick={props.onClearAll}
      >
        Clear
      </Button>
    </div>
  );
}
