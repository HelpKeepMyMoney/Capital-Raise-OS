"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Building2, FileStack, Send, UserPlus, ListTodo, LayoutDashboard } from "lucide-react";

type SearchResult = {
  investors: { id: string; name: string }[];
  deals: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
};

export function ShellCommandPalette(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [data, setData] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setQuery("");
      setData(null);
      setLoading(false);
    }
    props.onOpenChange(open);
  }

  function handleQueryChange(v: string) {
    setQuery(v);
    if (!v.trim()) {
      setData(null);
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!props.open || query.trim().length < 1) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      void (async () => {
        setLoading(true);
        setData(null);
        try {
          const res = await fetch(`/api/org-search?q=${encodeURIComponent(query.trim())}`, {
            cache: "no-store",
          });
          if (!res.ok) {
            if (!cancelled) setData({ investors: [], deals: [], tasks: [] });
            return;
          }
          const json = (await res.json()) as SearchResult;
          if (!cancelled) setData(json);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [props.open, query]);

  function go(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  const hasResults =
    data &&
    (data.investors.length > 0 || data.deals.length > 0 || data.tasks.length > 0);

  return (
    <CommandDialog open={props.open} onOpenChange={handleOpenChange} title="Search and actions">
      <Command shouldFilter={false} className="rounded-xl">
        <CommandInput
          placeholder="Search investors, deals, tasks, or run actions…"
          value={query}
          onValueChange={handleQueryChange}
        />
        <CommandList>
          {!query.trim() ? (
            <>
              <CommandGroup heading="Actions">
                <CommandItem value="new-investor" onSelect={() => go("/investors?add=1")}>
                  <UserPlus className="size-4" />
                  New investor
                </CommandItem>
                <CommandItem value="new-deal" onSelect={() => go("/deals/new")}>
                  <FileStack className="size-4" />
                  New deal
                </CommandItem>
                <CommandItem value="outreach" onSelect={() => go("/outreach")}>
                  <Send className="size-4" />
                  Send outreach
                </CommandItem>
                <CommandItem value="dashboard" onSelect={() => go("/dashboard")}>
                  <LayoutDashboard className="size-4" />
                  Command center
                </CommandItem>
              </CommandGroup>
              <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                Type to search your organization…
              </p>
            </>
          ) : loading ? (
            <CommandEmpty>Searching…</CommandEmpty>
          ) : hasResults ? (
            <>
              {data!.investors.length > 0 ? (
                <CommandGroup heading="Investors">
                  {data!.investors.map((i) => (
                    <CommandItem
                      key={i.id}
                      value={`inv-${i.id}`}
                      onSelect={() => go(`/investors/${i.id}`)}
                    >
                      <UserPlus className="size-4 opacity-60" />
                      {i.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {data!.deals.length > 0 ? (
                <CommandGroup heading="Deals">
                  {data!.deals.map((d) => (
                    <CommandItem
                      key={d.id}
                      value={`deal-${d.id}`}
                      onSelect={() => go(`/deals/${d.id}`)}
                    >
                      <Building2 className="size-4 opacity-60" />
                      {d.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {data!.tasks.length > 0 ? (
                <CommandGroup heading="Tasks">
                  {data!.tasks.map((t) => (
                    <CommandItem key={t.id} value={`task-${t.id}`} onSelect={() => go(`/tasks`)}>
                      <ListTodo className="size-4 opacity-60" />
                      {t.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </>
          ) : (
            <CommandEmpty>No matches.</CommandEmpty>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
