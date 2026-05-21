"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OutreachCampaign } from "@/lib/firestore/types";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<OutreachCampaign["status"], "secondary" | "default" | "outline"> = {
  draft: "secondary",
  active: "default",
  paused: "outline",
  completed: "secondary",
};

export function CampaignCard(props: {
  campaign: OutreachCampaign;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const m = props.campaign.metrics;
  return (
    <button type="button" onClick={props.onSelect} className="w-full text-left">
      <Card
        className={cn(
          "rounded-2xl border-border/80 shadow-sm transition hover:shadow-md",
          props.selected && "ring-2 ring-primary/40",
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="font-heading text-base font-semibold leading-snug">
            {props.campaign.name}
          </CardTitle>
          <Badge variant={STATUS_VARIANT[props.campaign.status]} className="shrink-0 capitalize">
            {props.campaign.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p className="capitalize">{props.campaign.campaignType.replace(/_/g, " ")}</p>
          <div className="flex flex-wrap gap-3 tabular-nums">
            <span>{m.recipients} recipients</span>
            <span>{m.sent} sent</span>
            <span>{m.opened} opened</span>
            <span>{m.replied} replied</span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
