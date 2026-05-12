"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileSignature } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import type { SigningRequestStatus } from "@/lib/firestore/types";
import { cn } from "@/lib/utils";

export type SubscriptionPacketApiResponse = {
  ok?: boolean;
  error?: string;
  id?: string;
  nativeEnvelopeId?: string;
  signingUrl?: string | null;
  sponsorSigningUrl?: string | null;
  awaitingSponsorPrep?: boolean;
  sponsorNotificationSent?: boolean;
  status?: SigningRequestStatus;
};

/** POST /api/esign/subscription/create — shared by hero, footer, and subscription card. */
export async function postSubscriptionPacketRequest(dealId: string): Promise<SubscriptionPacketApiResponse> {
  const res = await fetch("/api/esign/subscription/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dealId }),
  });
  const json = (await res.json()) as SubscriptionPacketApiResponse & { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? "Could not start signing");
  }
  return json;
}

export function subscriptionPacketToast(json: SubscriptionPacketApiResponse) {
  if (json.awaitingSponsorPrep) {
    toast.success(
      json.sponsorNotificationSent === false
        ? "Request recorded. Your sponsor must sign first—share the manual link in Subscription documents if they did not get an email. You will receive your signing link after they finish."
        : "Request sent. Your sponsor must sign first. You will get an email with your signing link after they finish.",
    );
  } else if (json.signingUrl) {
    window.open(json.signingUrl, "_blank", "noopener,noreferrer");
    toast.success("Opening subscription documents…");
  } else {
    toast.message("Packet created — check back shortly.");
  }
}

type ButtonProps = {
  dealId: string;
  /** When the native subscription envelope is fully signed, show download instead of request. */
  subscriptionCompleted?: boolean;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  label?: string;
  showIcon?: boolean;
  /** Use native button (default) or stretch Link styles */
  fullWidth?: boolean;
};

function finalDocumentHref(dealId: string) {
  return `/api/esign/subscription/final-document?dealId=${encodeURIComponent(dealId)}`;
}

export function RequestSubscriptionPacketButton(props: ButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const label = props.label ?? "Request subscription packet";
  const downloadLabel = "Download subscription packet";

  if (props.subscriptionCompleted) {
    return (
      <Link
        href={finalDocumentHref(props.dealId)}
        target="_blank"
        rel="noreferrer"
        className={cn(
          buttonVariants({ variant: props.variant ?? "outline", size: props.size ?? "default" }),
          "justify-center gap-2 rounded-xl",
          props.fullWidth !== false && "w-full sm:w-auto",
          props.className,
        )}
      >
        {props.showIcon !== false ? <Download className="size-4 shrink-0" /> : null}
        {downloadLabel}
      </Link>
    );
  }

  async function onClick() {
    setLoading(true);
    try {
      const json = await postSubscriptionPacketRequest(props.dealId);
      subscriptionPacketToast(json);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signing failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={props.variant ?? "outline"}
      size={props.size ?? "default"}
      disabled={loading}
      className={cn(
        "justify-center gap-2 rounded-xl",
        props.fullWidth !== false && "w-full sm:w-auto",
        props.className,
      )}
      onClick={() => void onClick()}
    >
      {props.showIcon !== false ? <FileSignature className="size-4 shrink-0" /> : null}
      {loading ? "Working…" : label}
    </Button>
  );
}
