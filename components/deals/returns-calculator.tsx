"use client";

import * as React from "react";
import {
  RETURN_SCENARIOS,
  type ReturnScenarioId,
  projectedReturns,
} from "@/lib/deals/returns-assumptions";
import { fmtUsd } from "@/lib/deals/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function ReturnsCalculator(props: {
  className?: string;
  minimumInvestment?: number;
}) {
  const [amount, setAmount] = React.useState(
    props.minimumInvestment && props.minimumInvestment > 0
      ? String(Math.max(props.minimumInvestment, 25000))
      : "50000",
  );
  const [scenario, setScenario] = React.useState<ReturnScenarioId>("base");

  const principal = Math.max(0, Math.floor(Number(amount) || 0));
  const out = projectedReturns(principal, scenario);

  return (
    <Card className={cn("rounded-2xl border-border/80 shadow-sm", props.className)}>
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-lg">Estimate potential returns</CardTitle>
        <CardDescription>
          Interactive illustration only. Figures are hypothetical assumption sets, not actual offering
          terms, forecasts, or guarantees.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          role="note"
          className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-foreground dark:border-amber-400/20 dark:bg-amber-500/10"
        >
          <strong className="font-semibold">Important:</strong> This calculator is for discussion
          purposes only. It does not constitute an offer to sell or a solicitation to buy securities.
          Past or projected performance is not indicative of future results. Rely on the private
          placement memorandum, subscription agreement, and counsel — not this tool.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="returns-amount">Investment amount (USD)</Label>
            <Input
              id="returns-amount"
              type="number"
              min={1}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl"
            />
            {props.minimumInvestment != null && props.minimumInvestment > 0 ? (
              <p className="text-xs text-muted-foreground">
                Stated minimum for this offering: {fmtUsd(props.minimumInvestment)}.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Scenario (assumption set)</Label>
            <Select value={scenario} onValueChange={(v) => setScenario(v as ReturnScenarioId)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RETURN_SCENARIOS) as ReturnScenarioId[]).map((id) => (
                  <SelectItem key={id} value={id}>
                    {RETURN_SCENARIOS[id].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {RETURN_SCENARIOS[scenario].label}: illustrative coupon-style accrual and revenue-share
              style uplift over ~{RETURN_SCENARIOS[scenario].years} years (not your actual instrument).
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Principal" value={fmtUsd(out.principal)} />
          <Metric label="Interest (illustrative)" value={fmtUsd(out.interest)} />
          <Metric label="Revenue share estimate" value={fmtUsd(out.revenueShareEstimate)} />
          <Metric label="Total illustrative payout" value={fmtUsd(out.totalPayout)} emphasis />
          <Metric label="MOIC (illustrative)" value={`${out.moic.toFixed(2)}x`} emphasis />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric(props: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-muted/30 px-4 py-3",
        props.emphasis && "border-primary/25 bg-primary/[0.06]",
      )}
    >
      <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
        {props.label}
      </p>
      <p className="mt-1 font-heading text-lg font-bold tabular-nums tracking-tight">{props.value}</p>
    </div>
  );
}
