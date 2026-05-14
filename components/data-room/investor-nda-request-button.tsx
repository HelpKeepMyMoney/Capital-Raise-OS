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
      toast.success(
        r.emailed
          ? "Request sent to your sponsor."
          : "Request saved. We could not email sponsors automatically — contact them if you need a fast response.",
      );
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
