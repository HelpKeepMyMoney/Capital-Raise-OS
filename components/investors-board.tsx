"use client";

import * as React from "react";
import type { Investor, PipelineStage } from "@/lib/firestore/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateInvestorStage } from "@/app/actions/investors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STAGES: PipelineStage[] = [
  "lead",
  "researching",
  "contacted",
  "responded",
  "meeting_scheduled",
  "data_room_opened",
  "due_diligence",
  "soft_circled",
  "committed",
  "closed",
  "declined",
];

const stageLabel = (s: PipelineStage) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function InvestorsBoard(props: { initial: Investor[] }) {
  const [investors, setInvestors] = React.useState(props.initial);

  async function onStageChange(id: string, stage: PipelineStage) {
    setInvestors((prev) => prev.map((i) => (i.id === id ? { ...i, pipelineStage: stage } : i)));
    await updateInvestorStage(id, stage);
  }

  const grouped = React.useMemo(() => {
    const m = new Map<PipelineStage, Investor[]>();
    for (const s of STAGES) m.set(s, []);
    for (const inv of investors) {
      m.get(inv.pipelineStage)?.push(inv);
    }
    return m;
  }, [investors]);

  return (
    <Tabs defaultValue="board" className="space-y-4">
      <TabsList>
        <TabsTrigger value="board">Kanban</TabsTrigger>
        <TabsTrigger value="table">Table</TabsTrigger>
      </TabsList>
      <TabsContent value="board" className="space-y-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <div key={stage} className="min-w-[240px] max-w-[280px] flex-1">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {stageLabel(stage)}
                </h3>
                <Badge variant="secondary">{grouped.get(stage)?.length ?? 0}</Badge>
              </div>
              <ScrollArea className="h-[calc(100vh-16rem)] pr-2">
                <div className="flex flex-col gap-2">
                  {(grouped.get(stage) ?? []).map((inv) => (
                    <Card
                      key={inv.id}
                      className="border-white/10 bg-card/70 backdrop-blur-md shadow-md"
                    >
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-sm font-medium leading-tight">{inv.name}</CardTitle>
                        {inv.firm ? (
                          <p className="text-xs text-muted-foreground truncate">{inv.firm}</p>
                        ) : null}
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        <Select
                          value={inv.pipelineStage}
                          onValueChange={(v) => void onStageChange(inv.id, v as PipelineStage)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {stageLabel(s)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {inv.checkSizeMin != null && inv.checkSizeMax != null ? (
                          <p className="text-[11px] text-muted-foreground">
                            Check ${(inv.checkSizeMin / 1000).toFixed(0)}K–$
                            {(inv.checkSizeMax / 1_000_000).toFixed(1)}M
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="table">
        <Card className="border-white/10 bg-card/60 backdrop-blur-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Firm</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Warmth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investors.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.name}</TableCell>
                    <TableCell>{inv.firm}</TableCell>
                    <TableCell>
                      <Select
                        value={inv.pipelineStage}
                        onValueChange={(v) => void onStageChange(inv.id, v as PipelineStage)}
                      >
                        <SelectTrigger className="h-8 w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {stageLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="capitalize">{inv.investorType ?? "—"}</TableCell>
                    <TableCell className="capitalize">{inv.warmCold ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
