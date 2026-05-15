"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type EligibleRow = { id: string; email: string; displayName: string };

type Props = {
  dataRoomId: string;
  roomName: string;
  /** Saved deal id on the room — refetch eligible investors when this changes (e.g. after Save settings). */
  associatedDealId: string;
  ndaRequired: boolean;
  hasNdaTemplate: boolean;
  /** Template id from the room settings form (used even before Save settings). */
  signableTemplateId: string;
};

export function EsignSendPanel(props: Props) {
  const [investorId, setInvestorId] = React.useState<string>("");
  const [eligible, setEligible] = React.useState<EligibleRow[]>([]);
  const [loadingEligible, setLoadingEligible] = React.useState(false);
  const [noDealLinked, setNoDealLinked] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [sponsorUrl, setSponsorUrl] = React.useState<string | null>(null);
  const [investorUrl, setInvestorUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingEligible(true);
      setInvestorId("");
      try {
        const res = await fetch(
          `/api/data-room/rooms/${encodeURIComponent(props.dataRoomId)}/nda-eligible-investors`,
        );
        const json = (await res.json()) as {
          investors?: EligibleRow[];
          noDealLinked?: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Could not load investors");
        if (!cancelled) {
          const invs = json.investors ?? [];
          setEligible(invs);
          setNoDealLinked(Boolean(json.noDealLinked));
          if (invs.length === 1) setInvestorId(invs[0]!.id);
          else setInvestorId("");
        }
      } catch (e) {
        if (!cancelled) {
          setEligible([]);
          setNoDealLinked(false);
          toast.error(e instanceof Error ? e.message : "Could not load investors");
        }
      } finally {
        if (!cancelled) setLoadingEligible(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [props.dataRoomId, props.associatedDealId]);

  if (!props.ndaRequired || !props.hasNdaTemplate) {
    const reasons: string[] = [];
    if (!props.ndaRequired) reasons.push('turn on "NDA required before access" for this room');
    if (!props.hasNdaTemplate) reasons.push("choose a room access agreement template above");
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
    if (!investorId) {
      toast.error("Choose an investor from the list");
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
          investorId,
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

  const selected = eligible.find((r) => r.id === investorId);

  return (
    <Card className="max-w-xl rounded-2xl border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Send for signature (e-sign)</CardTitle>
        <CardDescription>
          NDAs can only go to CRM contacts who have this room&apos;s deal under{" "}
          <span className="font-medium">Interested deals</span>. Link the room to a deal above, save settings, then
          choose the investor here.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {noDealLinked ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-50">
            Associate this room with a deal under <span className="font-medium">Associated deal</span>, then save room
            settings. Eligible investors appear here once they have that deal checked under Interested deals on their CRM
            profile.
          </p>
        ) : null}

        {!noDealLinked && !loadingEligible && eligible.length === 0 ? (
          <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            No eligible investors yet. Add people in Investor CRM and mark <span className="font-medium text-foreground">Interested deals</span> to include this room&apos;s deal, with a valid email on file.
          </p>
        ) : null}

        <div className="space-y-2">
          <Label>Investor (CRM — deal access)</Label>
          <Select
            value={investorId || undefined}
            onValueChange={(v) => setInvestorId(typeof v === "string" ? v : "")}
            disabled={loadingEligible || noDealLinked || eligible.length === 0}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue
                placeholder={loadingEligible ? "Loading…" : "Choose investor email…"}
              />
            </SelectTrigger>
            <SelectContent>
              {eligible.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.displayName} — {row.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected ? (
            <p className="text-[11px] text-muted-foreground">
              Sending to <span className="font-medium text-foreground">{selected.email}</span> ({selected.displayName}
              ).
            </p>
          ) : null}
        </div>

        <p className="text-[11px] text-muted-foreground">
          The investor always signs first on this room&apos;s NDA; the sponsor is emailed when it is their turn. Deal
          room documents unlock for the investor after they complete their signing step. Uses the template selected
          above (save room settings to store it as this room&apos;s default).
        </p>
        <Button
          type="button"
          className="max-w-xs rounded-xl"
          disabled={submitting || !investorId}
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
