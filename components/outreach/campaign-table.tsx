"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OutreachCampaign } from "@/lib/firestore/types";
import { cn } from "@/lib/utils";

export function CampaignTable(props: {
  campaigns: OutreachCampaign[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Recipients</TableHead>
            <TableHead className="text-right">Sent</TableHead>
            <TableHead className="text-right">Opened</TableHead>
            <TableHead className="text-right">Replied</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.campaigns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                No campaigns yet. Create one to start institutional outreach.
              </TableCell>
            </TableRow>
          ) : (
            props.campaigns.map((c) => (
              <TableRow
                key={c.id}
                role="button"
                tabIndex={0}
                aria-selected={props.selectedId === c.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  props.selectedId === c.id
                    ? "bg-primary/8 ring-1 ring-inset ring-primary/30"
                    : "hover:bg-muted/50",
                )}
                onClick={() => props.onSelect(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    props.onSelect(c.id);
                  }
                }}
              >
                <TableCell className="font-medium text-primary underline-offset-4 hover:underline">
                  {c.name}
                </TableCell>
                <TableCell className="capitalize text-muted-foreground">
                  {c.campaignType.replace(/_/g, " ")}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{c.metrics.recipients}</TableCell>
                <TableCell className="text-right tabular-nums">{c.metrics.sent}</TableCell>
                <TableCell className="text-right tabular-nums">{c.metrics.opened}</TableCell>
                <TableCell className="text-right tabular-nums">{c.metrics.replied}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
