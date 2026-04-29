"use client";

import * as React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Investor, InvestorType } from "@/lib/firestore/types";
import {
  compareInvestorsByLastFirst,
  investorLastFirstName,
} from "@/lib/investors/display-name";
import { weightedPipelineValueUsd } from "@/lib/investors/investor-kpis";
import { pipelineStageLabel } from "@/lib/investors/form-options";
import type { OrganizationMemberPublic } from "@/lib/firestore/queries";
import { cn } from "@/lib/utils";
import { LayoutGrid, Network, PieChart } from "lucide-react";

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

type TerritoryBucket = "VC" | "Family office" | "Corporate" | "Guest LP" | "Retail & angels" | "Other";

function territoryOf(inv: Investor): TerritoryBucket {
  if (inv.linkedUserId) return "Guest LP";
  switch (inv.investorType) {
    case "vc":
      return "VC";
    case "family_office":
    case "fund_of_funds":
      return "Family office";
    case "corporate":
      return "Corporate";
    case "angel":
    case "high_net_worth":
    case "accelerator":
      return "Retail & angels";
    default:
      return "Other";
  }
}

export function RelationshipMap(props: {
  investors: Investor[];
  members: OrganizationMemberPublic[];
  className?: string;
}) {
  const coverageRows = React.useMemo(() => {
    const m = new Map<string, Investor[]>();
    for (const inv of props.investors) {
      const uid = inv.relationshipOwnerUserId ?? "";
      if (!m.has(uid)) m.set(uid, []);
      m.get(uid)!.push(inv);
    }
    const ownerLabel = (uid: string) => {
      if (!uid) return "Unassigned";
      const mem = props.members.find((x) => x.userId === uid);
      return mem?.displayName ?? mem?.email ?? "Team member";
    };
    return Array.from(m.entries())
      .map(([uid, rows]) => {
        const avgScore =
          rows.reduce((s, r) => s + (r.relationshipScore ?? 0), 0) / Math.max(1, rows.length);
        const pipe = weightedPipelineValueUsd(rows);
        return {
          uid,
          label: ownerLabel(uid),
          investors: rows.length,
          pipeline: pipe,
          avgScore: Math.round(avgScore),
          rows,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [props.investors, props.members]);

  const territoryGroups = React.useMemo(() => {
    const m = new Map<TerritoryBucket, Investor[]>();
    const buckets: TerritoryBucket[] = [
      "VC",
      "Family office",
      "Corporate",
      "Guest LP",
      "Retail & angels",
      "Other",
    ];
    for (const b of buckets) m.set(b, []);
    for (const inv of props.investors) {
      const b = territoryOf(inv);
      m.get(b)!.push(inv);
    }
    return buckets.map((b) => ({ bucket: b, rows: m.get(b)! }));
  }, [props.investors]);

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card shadow-sm", props.className)}>
      <Tabs defaultValue="coverage" className="w-full">
        <div className="border-b border-border/60 px-4 pt-4">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1 md:inline-flex md:w-auto">
            <TabsTrigger value="coverage" className="rounded-lg gap-2">
              <LayoutGrid className="size-4 opacity-70" />
              Coverage grid
            </TabsTrigger>
            <TabsTrigger value="network" className="rounded-lg gap-2">
              <Network className="size-4 opacity-70" />
              Network graph
            </TabsTrigger>
            <TabsTrigger value="territory" className="rounded-lg gap-2">
              <PieChart className="size-4 opacity-70" />
              Territory
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="coverage" className="p-4 pt-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Owner span of control — projected pipeline uses the same weighted midpoint logic as the dashboard.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold">Owner</TableHead>
                  <TableHead className="text-xs font-semibold">Investors</TableHead>
                  <TableHead className="text-xs font-semibold">Weighted pipeline</TableHead>
                  <TableHead className="text-xs font-semibold">Avg score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No data for current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  coverageRows.map((r) => (
                    <TableRow key={r.uid || "none"}>
                      <TableCell className="font-medium">{r.label}</TableCell>
                      <TableCell className="font-mono tabular-nums">{r.investors}</TableCell>
                      <TableCell className="font-mono tabular-nums">{fmtUsd(r.pipeline)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{r.avgScore}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="network" className="p-4 pt-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Team links — each owner&apos;s investors surface as relationship edges for coordination.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {coverageRows.map((r) => (
              <div
                key={r.uid || "none"}
                className="rounded-2xl border border-border/70 bg-muted/15 p-4 shadow-inner"
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <span className="font-semibold">{r.label}</span>
                  <Badge variant="secondary">{r.investors}</Badge>
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {[...r.rows].sort((a, b) => compareInvestorsByLastFirst(a, b)).map((inv) => (
                    <li key={inv.id}>
                      <Link
                        href={`/investors/${inv.id}`}
                        className="flex flex-col rounded-lg border border-transparent px-2 py-1.5 text-sm transition-colors hover:border-border hover:bg-card"
                      >
                        <span className="font-medium">{investorLastFirstName(inv)}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {pipelineStageLabel(inv.pipelineStage)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="territory" className="p-4 pt-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Segment coverage — capital allocator archetypes across your funnel.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {territoryGroups.map(({ bucket, rows }) => (
              <div
                key={bucket}
                className="rounded-2xl border border-border/70 bg-muted/10 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{bucket}</h4>
                  <Badge variant="outline">{rows.length}</Badge>
                </div>
                <ul className="max-h-52 space-y-1 overflow-y-auto text-sm">
                  {rows.length === 0 ? (
                    <li className="text-xs text-muted-foreground">None</li>
                  ) : (
                    rows.map((inv) => (
                      <li key={inv.id}>
                        <Link href={`/investors/${inv.id}`} className="hover:text-primary hover:underline">
                          {investorLastFirstName(inv)}
                          {inv.firm ? (
                            <span className="text-muted-foreground"> · {inv.firm}</span>
                          ) : null}
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
