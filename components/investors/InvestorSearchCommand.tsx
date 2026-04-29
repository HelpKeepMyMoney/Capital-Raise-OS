"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { investorDisplayName } from "@/lib/investors/display-name";
import type { Investor } from "@/lib/firestore/types";

export function InvestorSearchCommand(props: {
  investors: Investor[];
  deals: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      props.onOpenChange(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Only re-bind when handler identity changes — avoids stale closures from broad props deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.onOpenChange]);

  return (
    <CommandDialog open={props.open} onOpenChange={props.onOpenChange} title="Search CRM">
      <CommandInput placeholder="Search investors, firms, deals…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Investors">
          {props.investors.slice(0, 40).map((inv) => (
            <CommandItem
              key={inv.id}
              value={`${investorDisplayName(inv)} ${inv.firm ?? ""} ${inv.notesSummary ?? ""}`}
              onSelect={() => {
                router.push(`/investors/${inv.id}`);
                props.onOpenChange(false);
              }}
            >
              <span className="font-medium">{investorDisplayName(inv)}</span>
              {inv.firm ? (
                <span className="ml-2 text-xs text-muted-foreground">{inv.firm}</span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Deals">
          {props.deals.map((d) => (
            <CommandItem
              key={d.id}
              value={d.name}
              onSelect={() => {
                router.push(`/deals/${d.id}`);
                props.onOpenChange(false);
              }}
            >
              {d.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
