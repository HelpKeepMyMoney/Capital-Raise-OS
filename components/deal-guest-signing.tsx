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
import {
  postSubscriptionPacketRequest,
  subscriptionPacketToast,
} from "@/components/deals/request-subscription-packet-button";
import {
  postQuestionnairePacketRequest,
  questionnairePacketToast,
} from "@/components/deals/request-questionnaire-packet-button";

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
  initialQuestionnaire: SigningRequest | null;
  questionnaireConfigured: boolean;
}) {
  const router = useRouter();
  const [row, setRow] = React.useState<SigningRequest | null>(props.initial);
  const [qRow, setQRow] = React.useState<SigningRequest | null>(props.initialQuestionnaire);
  const [loading, setLoading] = React.useState(false);
  const [qLoading, setQLoading] = React.useState(false);
  const [sponsorNotifyOk, setSponsorNotifyOk] = React.useState<boolean | null>(null);
  const [qSponsorNotifyOk, setQSponsorNotifyOk] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    setRow(props.initial);
  }, [props.initial]);

  React.useEffect(() => {
    setQRow(props.initialQuestionnaire);
  }, [props.initialQuestionnaire]);

  const status: SigningRequestStatus | "none" = row?.status ?? "none";
  const qStatus: SigningRequestStatus | "none" = qRow?.status ?? "none";

  async function requestPacket() {
    setLoading(true);
    try {
      const json = await postSubscriptionPacketRequest(props.dealId);
      const now = Date.now();
      setSponsorNotifyOk(json.sponsorNotificationSent ?? null);
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
      subscriptionPacketToast(json);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signing failed");
    } finally {
      setLoading(false);
    }
  }

  async function requestQuestionnaire() {
    setQLoading(true);
    try {
      const json = await postQuestionnairePacketRequest(props.dealId);
      const now = Date.now();
      setQSponsorNotifyOk(json.sponsorNotificationSent ?? null);
      setQRow({
        id: json.id ?? qRow?.id ?? "",
        organizationId: props.orgId,
        dealId: props.dealId,
        userId: props.userId,
        nativeEnvelopeId: json.nativeEnvelopeId,
        signingUrl: json.signingUrl ?? undefined,
        sponsorSigningUrl: json.sponsorSigningUrl ?? undefined,
        awaitingSponsorPrep: json.awaitingSponsorPrep,
        status: json.status ?? "sent",
        createdAt: qRow?.createdAt ?? now,
        updatedAt: now,
      });
      questionnairePacketToast(json);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signing failed");
    } finally {
      setQLoading(false);
    }
  }

  const showRequest =
    !row ||
    row.status === "draft" ||
    row.status === "declined" ||
    row.status === "error" ||
    row.awaitingSponsorPrep ||
    (row.status === "sent" && !row.signingUrl);

  const showQRequest =
    !qRow ||
    qRow.status === "draft" ||
    qRow.status === "declined" ||
    qRow.status === "error" ||
    qRow.awaitingSponsorPrep ||
    (qRow.status === "sent" && !qRow.signingUrl);

  return (
    <div className="space-y-4">
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
            Your sponsor attaches the subscription PDF in settings. When sponsor fields exist, they sign first; you will
            receive an email with your signing link when it is your turn.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {row?.awaitingSponsorPrep ? (
            <div className="w-full rounded-xl border border-border/80 bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">Sponsor signs first</p>
              <p className="mt-1 text-muted-foreground">
                {sponsorNotifyOk === false
                  ? "We could not email your sponsor automatically (add a contact email in the workspace profile or ensure email is configured). Share the signing link below with your sponsor. After they finish, you will receive an email with your signing link."
                  : sponsorNotifyOk === true
                    ? "We emailed your sponsor team a link to sign. After they finish, you will receive an email with your personal signing link."
                    : "Your sponsor must complete their signing step first. After they finish, you will receive an email with your personal signing link."}
              </p>
              {row.sponsorSigningUrl ? (
                <details className="mt-2" open={sponsorNotifyOk === false}>
                  <summary className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:underline">
                    Share signing link manually
                  </summary>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="max-w-full truncate rounded-md bg-muted px-2 py-1 text-xs">
                      {row.sponsorSigningUrl}
                    </code>
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
                      Copy link
                    </Button>
                  </div>
                </details>
              ) : null}
            </div>
          ) : null}
          {row?.signingUrl && row.status !== "completed" && row.status !== "declined" ? (
            <a href={row.signingUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants(), "rounded-xl")}>
              Open documents to sign
            </a>
          ) : null}
          {showRequest ? (
            <Button type="button" className="rounded-xl" disabled={loading} onClick={() => void requestPacket()}>
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
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-md">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <FileSignature className="size-5 text-primary" />
            <CardTitle className="font-heading text-lg">Investor questionnaire</CardTitle>
            <Badge variant="secondary" className="ml-auto">
              {labelForStatus(qStatus)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {props.questionnaireConfigured ? (
              <>
                Your sponsor designates this questionnaire in Settings → E-sign. The same sponsor-first rules apply when
                the template includes sponsor fields.
              </>
            ) : (
              <>
                Your sponsor has not assigned an investor questionnaire template in Settings → E-sign yet. After they
                connect one, you can request it here—the same sponsor-first flow as subscription documents. If you try
                before it is set up, you will see a short message explaining what is missing.
              </>
            )}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {qRow?.awaitingSponsorPrep ? (
            <div className="w-full rounded-xl border border-border/80 bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">Sponsor signs first</p>
              <p className="mt-1 text-muted-foreground">
                {qSponsorNotifyOk === false
                  ? "We could not email your sponsor automatically. Share the signing link below with your sponsor. After they finish, you will receive an email with your signing link."
                  : qSponsorNotifyOk === true
                    ? "We emailed your sponsor team a link to sign. After they finish, you will receive an email with your personal signing link."
                    : "Your sponsor must complete their signing step first. After they finish, you will receive an email with your personal signing link."}
              </p>
              {qRow.sponsorSigningUrl ? (
                <details className="mt-2" open={qSponsorNotifyOk === false}>
                  <summary className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:underline">
                    Share signing link manually
                  </summary>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="max-w-full truncate rounded-md bg-muted px-2 py-1 text-xs">
                      {qRow.sponsorSigningUrl}
                    </code>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        void navigator.clipboard.writeText(qRow.sponsorSigningUrl ?? "");
                        toast.success("Sponsor link copied");
                      }}
                    >
                      Copy link
                    </Button>
                  </div>
                </details>
              ) : null}
            </div>
          ) : null}
          {qRow?.signingUrl && qRow.status !== "completed" && qRow.status !== "declined" ? (
            <a href={qRow.signingUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants(), "rounded-xl")}>
              Open questionnaire to sign
            </a>
          ) : null}
          {showQRequest ? (
            <Button type="button" className="rounded-xl" disabled={qLoading} onClick={() => void requestQuestionnaire()}>
              {qLoading ? "Working…" : qRow ? "Request again / refresh questionnaire" : "Request investor questionnaire"}
            </Button>
          ) : null}
          {qRow?.status === "completed" ? (
            <>
              <p className="text-sm text-muted-foreground">Questionnaire is on file.</p>
              <a
                href={`/api/esign/questionnaire/final-document?dealId=${encodeURIComponent(props.dealId)}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-xl")}
              >
                Download signed PDF
              </a>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Link
        href="/portal/commitments"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
      >
        My commitments
      </Link>
    </div>
  );
}
