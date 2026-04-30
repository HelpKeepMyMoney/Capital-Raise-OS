"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSignature } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SigningRequest, SigningRequestStatus } from "@/lib/firestore/types";
import { cn } from "@/lib/utils";

function labelForStatus(s: SigningRequestStatus | "none"): string {
  const m: Record<string, string> = {
    draft: "Not sent",
    sent: "Awaiting signature",
    viewed: "In progress",
    completed: "Complete",
    declined: "Declined",
    error: "Error",
    none: "Not started",
  };
  return m[s] ?? s;
}

export function DealGuestSigning(props: {
  dealId: string;
  orgId: string;
  userId: string;
  initial: SigningRequest | null;
}) {
  const router = useRouter();
  const [row, setRow] = React.useState<SigningRequest | null>(props.initial);
  const [loading, setLoading] = React.useState(false);

  const status: SigningRequestStatus | "none" = row?.status ?? "none";

  async function requestPacket() {
    setLoading(true);
    try {
      const res = await fetch("/api/esign/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: props.dealId }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        mode?: string;
        message?: string;
        error?: string;
        id?: string;
        nativeEnvelopeId?: string;
        signingUrl?: string | null;
        sponsorSigningUrl?: string | null;
        awaitingSponsorPrep?: boolean;
        status?: SigningRequestStatus;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not start signing");
      }
      const now = Date.now();
      setRow({
        id: json.id ?? row?.id ?? "",
        organizationId: props.orgId,
        dealId: props.dealId,
        userId: props.userId,
        nativeEnvelopeId: json.nativeEnvelopeId,
        signingUrl: json.signingUrl ?? undefined,
        sponsorSigningUrl: json.sponsorSigningUrl ?? undefined,
        awaitingSponsorPrep: json.awaitingSponsorPrep,
        status: json.status ?? "sent",
        createdAt: row?.createdAt ?? now,
        updatedAt: now,
      });
      if (json.awaitingSponsorPrep) {
        toast.message("Your sponsor must complete the sponsor signing step before you can sign. Refresh after they finish.");
      } else if (json.signingUrl) {
        window.open(json.signingUrl, "_blank", "noopener,noreferrer");
        toast.success("Opening subscription documents…");
      } else {
        toast.message("Packet created — check back shortly.");
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signing failed");
    } finally {
      setLoading(false);
    }
  }

  const showRequest =
    !row ||
    row.status === "draft" ||
    row.status === "declined" ||
    row.status === "error" ||
    row.awaitingSponsorPrep ||
    (row.status === "sent" && !row.signingUrl);

  return (
    <Card className="rounded-2xl border-border/80 shadow-md">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <FileSignature className="size-5 text-primary" />
          <CardTitle className="font-heading text-lg">Subscription documents</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            {labelForStatus(status)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Native e-sign: your sponsor links a subscription PDF in settings; you sign in a secure browser window.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {row?.awaitingSponsorPrep && row.sponsorSigningUrl ? (
          <div className="w-full rounded-xl border border-border/80 bg-muted/30 p-3 text-sm">
            <p className="font-medium text-foreground">Sponsor must sign first</p>
            <p className="mt-1 text-muted-foreground">
              Send this link to your sponsor so they can complete their fields. Your signing link will be ready
              after they finish.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="max-w-full truncate rounded-md bg-muted px-2 py-1 text-xs">{row.sponsorSigningUrl}</code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  void navigator.clipboard.writeText(row.sponsorSigningUrl ?? "");
                  toast.success("Sponsor link copied");
                }}
              >
                Copy sponsor link
              </Button>
            </div>
          </div>
        ) : null}
        {row?.signingUrl && row.status !== "completed" && row.status !== "declined" ? (
          <a
            href={row.signingUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants(), "rounded-xl")}
          >
            Open documents to sign
          </a>
        ) : null}
        {showRequest ? (
          <Button
            type="button"
            className="rounded-xl"
            disabled={loading}
            onClick={() => void requestPacket()}
          >
            {loading ? "Working…" : row ? "Request again / refresh packet" : "Request subscription packet"}
          </Button>
        ) : null}
        {row?.status === "completed" ? (
          <>
            <p className="text-sm text-muted-foreground">Subscription documents are on file.</p>
            <a
              href={`/api/esign/subscription/final-document?dealId=${encodeURIComponent(props.dealId)}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-xl")}
            >
              Download signed PDF
            </a>
          </>
        ) : null}
        <Link
          href="/portal/commitments"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
        >
          My commitments
        </Link>
      </CardContent>
    </Card>
  );
}
