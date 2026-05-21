"use client";

import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OutreachCampaignStatus, OutreachCampaignType } from "@/lib/firestore/types";
import { idNameSelectLabel } from "@/lib/ui/select-trigger-label";

function dealFilterLabel(dealId: string | "all", deals: { id: string; name: string }[]): string | undefined {
  if (dealId === "all") return "All deals";
  return idNameSelectLabel(dealId, deals);
}

export function OutreachFilters(props: {
  status: OutreachCampaignStatus | "all";
  campaignType: OutreachCampaignType | "all";
  dealId: string | "all";
  deals: { id: string; name: string }[];
  onStatusChange: (v: OutreachCampaignStatus | "all") => void;
  onTypeChange: (v: OutreachCampaignType | "all") => void;
  onDealChange: (v: string | "all") => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-wrap items-center gap-2"
    >
      <Select
        value={props.status}
        onValueChange={(v) => props.onStatusChange((v ?? "all") as typeof props.status)}
      >
        <SelectTrigger className="h-9 w-[140px] rounded-full">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="paused">Paused</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={props.campaignType}
        onValueChange={(v) => props.onTypeChange((v ?? "all") as typeof props.campaignType)}
      >
        <SelectTrigger className="h-9 w-[180px] rounded-full">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="capital_raise">Capital raise</SelectItem>
          <SelectItem value="lp_relations">LP relations</SelectItem>
          <SelectItem value="strategic_partnership">Strategic partnership</SelectItem>
          <SelectItem value="general">General</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={props.dealId}
        onValueChange={(v) => props.onDealChange((v ?? "all") as string | "all")}
      >
        <SelectTrigger className="h-9 min-w-[160px] rounded-full">
          <SelectValue placeholder="Deal" label={dealFilterLabel(props.dealId, props.deals)} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All deals</SelectItem>
          {props.deals.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </motion.div>
  );
}
