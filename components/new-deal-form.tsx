"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DealStatus, DealType } from "@/lib/firestore/types";

const TYPES: { value: DealType; label: string }[] = [
  { value: "startup_equity", label: "Startup equity" },
  { value: "safe", label: "SAFE" },
  { value: "convertible_note", label: "Convertible note" },
  { value: "real_estate_syndication", label: "Real estate syndication" },
  { value: "lp_fund", label: "LP fund" },
  { value: "revenue_share", label: "Revenue share" },
  { value: "private_bond", label: "Private bond" },
];

const STATUSES: { value: DealStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closing", label: "Closing" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

export function NewDealForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<DealType>("startup_equity");
  const [status, setStatus] = React.useState<DealStatus>("active");
  const [targetRaise, setTargetRaise] = React.useState("");
  const [minimumInvestment, setMinimumInvestment] = React.useState("");
  const [valuation, setValuation] = React.useState("");
  const [terms, setTerms] = React.useState("");
  const [useOfProceeds, setUseOfProceeds] = React.useState("");
  const [closeDate, setCloseDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    const n = name.trim();
    if (!n) {
      toast.error("Name is required");
      return;
    }

    const body: Record<string, unknown> = { name: n, type, status };

    const tr = targetRaise.replace(/,/g, "").trim();
    if (tr) {
      const v = Number(tr);
      if (!Number.isFinite(v) || v <= 0) {
        toast.error("Target raise must be a positive number");
        return;
      }
      body.targetRaise = v;
    }

    const mi = minimumInvestment.replace(/,/g, "").trim();
    if (mi) {
      const v = Number(mi);
      if (!Number.isFinite(v) || v <= 0) {
        toast.error("Minimum investment must be a positive number");
        return;
      }
      body.minimumInvestment = v;
    }

    const val = valuation.replace(/,/g, "").trim();
    if (val) {
      const v = Number(val);
      if (!Number.isFinite(v) || v <= 0) {
        toast.error("Valuation must be a positive number");
        return;
      }
      body.valuation = v;
    }

    if (terms.trim()) body.terms = terms.trim();
    if (useOfProceeds.trim()) body.useOfProceeds = useOfProceeds.trim();
    if (closeDate.trim()) {
      const t = new Date(closeDate).getTime();
      if (!Number.isFinite(t)) {
        toast.error("Invalid close date");
        return;
      }
      body.closeDate = t;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Could not create offering");
      toast.success("Offering created");
      router.push(`/deals/${data.id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create offering");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="deal-name">Name</Label>
        <Input
          id="deal-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Series A — CPIN Labs"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={type}
            onValueChange={(v) => v && setType(v as DealType)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => v && setStatus(v as DealStatus)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="target-raise">Target raise (USD)</Label>
          <Input
            id="target-raise"
            inputMode="decimal"
            placeholder="12000000"
            value={targetRaise}
            onChange={(e) => setTargetRaise(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min-inv">Minimum investment (USD)</Label>
          <Input
            id="min-inv"
            inputMode="decimal"
            placeholder="100000"
            value={minimumInvestment}
            onChange={(e) => setMinimumInvestment(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="valuation">Valuation (USD, optional)</Label>
        <Input
          id="valuation"
          inputMode="decimal"
          placeholder="48000000"
          value={valuation}
          onChange={(e) => setValuation(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="close">Target close (optional)</Label>
        <Input
          id="close"
          type="date"
          value={closeDate}
          onChange={(e) => setCloseDate(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="terms">Terms (optional)</Label>
        <Textarea id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="uop">Use of proceeds (optional)</Label>
        <Textarea
          id="uop"
          value={useOfProceeds}
          onChange={(e) => setUseOfProceeds(e.target.value)}
          rows={3}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={() => void submit()} disabled={saving}>
          {saving ? "Creating…" : "Create offering"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/deals")} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
