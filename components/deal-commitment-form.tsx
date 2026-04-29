"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DealCommitmentForm(props: {
  dealId: string;
  dealName: string;
  initialAmount?: number;
}) {
  const [amount, setAmount] = React.useState(
    props.initialAmount != null ? String(props.initialAmount) : "",
  );
  const [pending, setPending] = React.useState(false);

  async function submit(withdraw: boolean) {
    setPending(true);
    try {
      const res = await fetch("/api/deals/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: props.dealId,
          amount: withdraw ? undefined : Number(amount),
          withdraw,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast.success(
        withdraw ? "Commitment withdrawn" : `Commitment saved for ${props.dealName}`,
      );
      if (withdraw) setAmount("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save commitment");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
      <div>
        <Label htmlFor={`commit-${props.dealId}`}>Stated commitment (USD, whole dollars)</Label>
        <p className="text-xs text-muted-foreground">
          Non-binding indication for the issuer. Update anytime.
        </p>
        <Input
          id={`commit-${props.dealId}`}
          type="number"
          min={1}
          step={1}
          className="mt-2 max-w-xs"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 50000"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => void submit(false)}>
          {pending ? "Saving…" : "Save commitment"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => void submit(true)}
        >
          Withdraw commitment
        </Button>
      </div>
    </div>
  );
}
