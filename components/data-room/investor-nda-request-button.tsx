"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postInvestorNdaRequest } from "@/lib/data-room/nda-request-client";

type Props = {
  roomId: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
};

/** Lets an investor guest ask the sponsor to send / finish setting up the room NDA envelope. */
export function InvestorNdaRequestButton(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function onRequest() {
    setBusy(true);
    try {
      const r = await postInvestorNdaRequest(props.roomId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.envelopeCreated && typeof r.investorSigningUrl === "string" && r.investorSigningUrl.length > 0) {
        toast.success("NDA envelope created — opening signing page.");
        window.open(r.investorSigningUrl, "_blank", "noopener,noreferrer");
      } else if (r.envelopeCreated) {
        toast.success("NDA envelope created. Check your email for the signing link.");
      } else {
        toast.success(
          r.emailed
            ? "We emailed your sponsor with details."
            : "Request recorded. We could not email sponsors automatically — contact them if you need a fast response.",
        );
        if (r.envelopeError) toast.message(r.envelopeError, { duration: 12_000 });
      }
      router.refresh();
    } catch {
      toast.error("Could not send request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={props.variant ?? "default"}
      size={props.size ?? "sm"}
      className={props.className}
      disabled={busy}
      onClick={() => void onRequest()}
    >
      {busy ? "Sending…" : "Request NDA from sponsor"}
    </Button>
  );
}
