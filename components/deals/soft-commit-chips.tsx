"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trackDealTelemetry } from "@/components/deals/deal-telemetry";

const PRESETS = [25_000, 50_000, 100_000] as const;

export function SoftCommitChips(props: { dealId: string; dealName: string; minAmount?: number }) {
  const [custom, setCustom] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function submit(amount: number) {
    if (props.minAmount != null && amount < props.minAmount) {
      toast.error(`Minimum for this offering is ${props.minAmount.toLocaleString()} USD`);
      return;
    }
    setPending(true);
    try {
      void trackDealTelemetry(props.dealId, "cta_commit_click");
      const res = await fetch("/api/deals/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: props.dealId, amount: Math.floor(amount) }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast.success(`Interest recorded for ${props.dealName}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  return (
    <div id="express-interest" className="scroll-mt-24 space-y-3 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <p className="text-sm font-medium">Soft commit</p>
      <p className="text-xs text-muted-foreground">
        Non-binding indication; update your formal commitment below anytime.
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((amt) => (
          <Button
            key={amt}
            type="button"
            size="sm"
            variant="secondary"
            className="rounded-xl"
            disabled={pending}
            onClick={() => void submit(amt)}
          >
            Interested ${amt >= 1000 ? `${amt / 1000}K` : amt}+
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid flex-1 gap-1 text-xs font-medium">
          Custom (USD)
          <input
            type="number"
            min={1}
            className="h-9 rounded-xl border border-input bg-background px-3 text-sm"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. 75000"
          />
        </label>
        <Button
          type="button"
          size="sm"
          className="rounded-xl"
          disabled={pending}
          onClick={() => {
            const n = Number(custom);
            if (!Number.isFinite(n) || n < 1) {
              toast.error("Enter a valid amount");
              return;
            }
            void submit(n);
          }}
        >
          Submit
        </Button>
      </div>
    </div>
  );
}
