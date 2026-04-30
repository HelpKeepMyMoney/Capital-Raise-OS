"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  dataRoomId: string;
  roomName: string;
  ndaRequired: boolean;
  hasNdaTemplate: boolean;
  /** Template id from the room settings form (used even before Save settings). */
  signableTemplateId: string;
};

export function EsignSendPanel(props: Props) {
  const [investorEmail, setInvestorEmail] = React.useState("");
  const [investorName, setInvestorName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [sponsorUrl, setSponsorUrl] = React.useState<string | null>(null);
  const [investorUrl, setInvestorUrl] = React.useState<string | null>(null);

  if (!props.ndaRequired || !props.hasNdaTemplate) {
    const reasons: string[] = [];
    if (!props.ndaRequired) reasons.push('turn on "NDA required before access" for this room');
    if (!props.hasNdaTemplate) reasons.push("choose an agreement PDF template above");
    return (
      <Card className="max-w-xl rounded-2xl border-dashed border-border bg-muted/15 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Send for signature (e-sign)</CardTitle>
          <CardDescription>
            To create a signing envelope from this room, {reasons.join(", ")}. Templates are managed in the{" "}
            <Link href="/settings/esign" className="font-medium text-primary underline-offset-4 hover:underline">
              e-sign template library
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function createEnvelope() {
    const email = investorEmail.trim();
    if (!email) {
      toast.error("Enter the investor email");
      return;
    }
    setSubmitting(true);
    setSponsorUrl(null);
    setInvestorUrl(null);
    try {
      const res = await fetch("/api/esign/envelopes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "data_room_nda",
          dataRoomId: props.dataRoomId,
          investorEmail: email,
          investorName: investorName.trim() || undefined,
          signableTemplateId: props.signableTemplateId.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        sponsorSigningUrl?: string | null;
        investorSigningUrl?: string | null;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not create envelope");
      setSponsorUrl(json.sponsorSigningUrl ?? null);
      setInvestorUrl(json.investorSigningUrl ?? null);
      toast.success("Signing envelope created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create envelope");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyText(label: string, text: string | null) {
    if (!text) {
      toast.message(`No ${label} link returned.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.message(`${label} link copied`);
    } catch {
      toast.error(`Could not copy ${label} link`);
    }
  }

  return (
    <Card className="max-w-xl rounded-2xl border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Send for signature (e-sign)</CardTitle>
        <CardDescription>
          Creates a signing envelope for <span className="font-medium">{props.roomName}</span> using this room’s
          linked PDF template.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="mnda-inv-email">Investor email</Label>
          <Input
            id="mnda-inv-email"
            type="email"
            autoComplete="email"
            placeholder="investor@example.com"
            className="rounded-xl"
            value={investorEmail}
            onChange={(e) => setInvestorEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mnda-inv-name">Investor display name (optional)</Label>
          <Input
            id="mnda-inv-name"
            placeholder="Acme Investors LLC"
            className="rounded-xl"
            value={investorName}
            onChange={(e) => setInvestorName(e.target.value)}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Sponsor signs first when the template has sponsor fields; otherwise the investor link is active immediately.
          Uses the template selected above (save room settings to store it as this room&apos;s default).
        </p>
        <Button
          type="button"
          className="max-w-xs rounded-xl"
          disabled={submitting}
          onClick={() => void createEnvelope()}
        >
          {submitting ? "Creating…" : "Create envelope"}
        </Button>

        {(sponsorUrl || investorUrl) && (
          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">Signing links</p>
            <div className="flex flex-wrap gap-2">
              {sponsorUrl ? (
                <a
                  href={sponsorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm", className: "rounded-lg gap-1" }))}
                >
                  Open sponsor signing
                  <ExternalLink className="size-3.5 opacity-70" />
                </a>
              ) : null}
              {investorUrl ? (
                <a
                  href={investorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm", className: "rounded-lg gap-1" }))}
                >
                  Open investor signing
                  <ExternalLink className="size-3.5 opacity-70" />
                </a>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => void copyText("Sponsor", sponsorUrl)}>
                Copy sponsor link
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => void copyText("Investor", investorUrl)}>
                Copy investor link
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
