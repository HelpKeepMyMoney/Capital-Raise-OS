"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RankedInvestorCandidate } from "@/lib/discovery/types";

export function DiscoveryClient() {
  const [query, setQuery] = React.useState("Seed AI investors in Europe active in last 90 days");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<RankedInvestorCandidate[]>([]);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/discovery/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          filters: { recencyDays: 90, geography: "Europe", sector: "ai" },
        }),
      });
      const json = (await res.json()) as { results?: RankedInvestorCandidate[] };
      setResults(json.results ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-base">AI discovery</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-xs text-muted-foreground">Natural language query</label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-11" />
          </div>
          <Button className="h-11" onClick={() => void run()} disabled={loading}>
            {loading ? "Searching…" : "Rank investors"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {results.map((r) => (
          <Card key={r.id} className="border-white/10 bg-card/50 backdrop-blur-md">
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
          <p className="text-sm text-muted-foreground">Run a query to merge CRM + enrichment providers.</p>
        ) : null}
      </div>
    </div>
  );
}
