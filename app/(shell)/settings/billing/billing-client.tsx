"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  PLAN_CATALOG,
  BILLING_PLAN_ORDER,
  FEATURE_MATRIX_ROWS,
  ENTERPRISE_FEATURE_CELLS,
  PLAN_FEATURES,
  type PublicPlanId,
} from "@/lib/billing/plans";
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function Cell(props: { ok: boolean; text?: string }) {
  if (props.text !== undefined) {
    return (
      <td className="px-3 py-2.5 align-top text-sm text-muted-foreground">{props.text}</td>
    );
  }
  return (
    <td className="px-3 py-2.5 text-center">
      {props.ok ? (
        <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" aria-label="Included" />
      ) : (
        <Lock className="mx-auto size-4 text-muted-foreground" aria-label="Not included" />
      )}
    </td>
  );
}

export function BillingClient() {
  const [loading, setLoading] = React.useState<string | null>(null);

  async function subscribe(plan: PublicPlanId) {
    setLoading(plan);
    try {
      const res = await fetch("/api/billing/paypal/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = (await res.json()) as { approveUrl?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "PayPal error");
      if (json.approveUrl) window.location.href = json.approveUrl;
      else toast.message("Check PayPal plan IDs in environment");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Billing unavailable");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-foreground/85">
          Starter, Pro, and Growth (Growth maps to the Capital Team subscription in PayPal — same plan
          ID, clearer label).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {BILLING_PLAN_ORDER.map((id) => (
          <Card key={id} className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading">{PLAN_CATALOG[id].name}</CardTitle>
              <p className="text-3xl font-semibold tabular-nums">${PLAN_CATALOG[id].priceUsd}</p>
              <p className="text-sm text-muted-foreground">per month</p>
              {id === "capital_team" ? (
                <p className="text-[11px] text-muted-foreground">Internal plan id: capital_team</p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{PLAN_CATALOG[id].description}</p>
              {PLAN_CATALOG[id].blurb ? (
                <p className="text-xs font-medium text-foreground/80">{PLAN_CATALOG[id].blurb}</p>
              ) : null}
              <Button className="w-full rounded-xl" disabled={loading !== null} onClick={() => void subscribe(id)}>
                {loading === id ? "Redirecting…" : "Subscribe"}
              </Button>
            </CardContent>
          </Card>
        ))}
        <Card className="border-border bg-card shadow-sm lg:border-primary/35">
          <CardHeader>
            <CardTitle className="font-heading">Enterprise</CardTitle>
            <p className="text-sm font-medium text-muted-foreground">Custom pricing</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>SSO, data residency, volume commitments, and bespoke integrations.</p>
            <a
              href="mailto:enterprise@cpin.example"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "inline-flex w-full items-center justify-center rounded-xl",
              )}
            >
              Contact sales
            </a>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Feature comparison</CardTitle>
          <p className="text-sm text-muted-foreground">
            Module gates use the same rules in code (<code className="text-xs">lib/billing/features.ts</code>
            ).
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-3 font-medium text-muted-foreground">Capability</th>
                {BILLING_PLAN_ORDER.map((id) => (
                  <th key={id} className="px-3 py-3 font-heading text-foreground">
                    {PLAN_CATALOG[id].name}
                  </th>
                ))}
                <th className="px-3 py-3 font-heading text-foreground">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_MATRIX_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border/80">
                  <td className="px-3 py-2.5 font-medium">{row.label}</td>
                  {BILLING_PLAN_ORDER.map((id) => {
                    const feats = PLAN_FEATURES[id];
                    const v = feats[row.key];
                    if (row.key === "teamSeatsLabel" || row.key === "automationLabel") {
                      return <Cell key={id} ok text={String(v)} />;
                    }
                    return <Cell key={id} ok={Boolean(v)} />;
                  })}
                  {row.key === "teamSeatsLabel" || row.key === "automationLabel" ? (
                    <Cell ok text={String(ENTERPRISE_FEATURE_CELLS[row.key])} />
                  ) : (
                    <Cell ok={ENTERPRISE_FEATURE_CELLS[row.key]} />
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
