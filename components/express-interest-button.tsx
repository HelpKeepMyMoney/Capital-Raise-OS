"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ExpressInterestButton(props: { dealId: string; dealName: string }) {
  const [pending, setPending] = React.useState(false);

  async function onExpress() {
    setPending(true);
    try {
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
    <Button type="button" size="sm" onClick={() => void onExpress()} disabled={pending}>
      {pending ? "Saving…" : "Express interest"}
    </Button>
  );
}
