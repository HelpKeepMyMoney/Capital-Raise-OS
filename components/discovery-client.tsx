"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RankedInvestorCandidate } from "@/lib/discovery/types";

export function DiscoveryClient() {
  const [query, setQuery] = React.useState("");
  const [queryUsed, setQueryUsed] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<RankedInvestorCandidate[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function runSearch(submittedQuery: string) {
    const q = submittedQuery.trim();
    if (!q) {
      setError("Enter a search query before ranking.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/discovery/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ query: q }),
      });
      const json = (await res.json()) as {
        results?: RankedInvestorCandidate[];
        queryUsed?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Search failed");
        return;
      }
      setQueryUsed(json.queryUsed ?? q);
      setResults(json.results ?? []);
    } catch {
      setError("Search failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fromDom = inputRef.current?.value ?? query;
    void runSearch(fromDom);
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">AI discovery</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <label htmlFor="discovery-query" className="text-xs text-muted-foreground">
                Natural language query
              </label>
              <Input
                id="discovery-query"
                name="query"
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. healthcare seed Boston, fintech Europe angels"
                className="h-11"
                autoComplete="off"
              />
            </div>
            <Button type="submit" className="h-11" disabled={loading}>
              {loading ? "Searching…" : "Rank investors"}
            </Button>
          </form>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {queryUsed ? (
        <p className="text-xs text-muted-foreground">
          Ranked for: <span className="text-foreground">{queryUsed}</span>
        </p>
      ) : null}

      <div className="grid gap-3">
        {results.map((r) => (
          <Card key={r.id} className="border-border bg-card shadow-sm">
            <CardContent className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-sm text-muted-foreground">{r.firm}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.sources.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] uppercase">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-primary">{r.aiRankScore}</p>
                <p className="text-xs text-muted-foreground">AI rank</p>
                <ul className="mt-2 text-xs text-muted-foreground max-w-xs text-right list-none space-y-1">
                  {r.aiRankReasons.slice(0, 3).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
        {!results.length && !loading ? (
          <p className="text-sm text-foreground/80">
            Enter a query and rank investors to search your CRM (OpenAI refines scores when configured).
          </p>
        ) : null}
      </div>
    </div>
  );
}
