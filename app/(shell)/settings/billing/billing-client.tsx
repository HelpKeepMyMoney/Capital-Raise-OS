"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLAN_CATALOG, type PublicPlanId } from "@/lib/billing/plans";
import { toast } from "sonner";

const PLANS: PublicPlanId[] = ["starter", "pro", "capital_team"];

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
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-foreground/85">PayPal subscriptions with webhook sync.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((id) => (
          <Card key={id} className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{PLAN_CATALOG[id].name}</CardTitle>
              <p className="text-3xl font-semibold">${PLAN_CATALOG[id].priceUsd}</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{PLAN_CATALOG[id].description}</p>
              <Button className="w-full" disabled={loading !== null} onClick={() => void subscribe(id)}>
                {loading === id ? "Redirecting…" : "Subscribe"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Enterprise</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Contact sales for custom deployment, SSO, and data residency. Email{" "}
          <a className="underline" href="mailto:enterprise@cpin.example">
            enterprise@cpin.example
          </a>
          .
        </CardContent>
      </Card>
    </div>
  );
}
