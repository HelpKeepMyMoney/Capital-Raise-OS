"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trackDealTelemetry } from "@/components/deals/deal-telemetry";

export function ExpressInterestButton(props: {
  dealId: string;
  dealName: string;
  variant?: "ghost" | "outline";
}) {
  const [pending, setPending] = React.useState(false);

  async function onExpress() {
    setPending(true);
    try {
      void trackDealTelemetry(props.dealId, "cta_express_interest");
      const res = await fetch("/api/deals/express-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: props.dealId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast.success(`Interest recorded for ${props.dealName}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record interest");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={props.variant === "outline" ? "outline" : "ghost"}
      className={
        props.variant === "ghost"
          ? "w-full rounded-xl border border-dashed border-border/90 text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground sm:w-auto"
          : undefined
      }
      onClick={() => void onExpress()}
      disabled={pending}
    >
      {pending ? "Saving…" : "Express interest"}
    </Button>
  );
}
