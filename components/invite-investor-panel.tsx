"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type Scope = "org" | "deal";

export function InviteInvestorPanel(props: { dealId: string }) {
  const [scope, setScope] = React.useState<Scope>("deal");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [expiresInDays, setExpiresInDays] = React.useState("14");
  const [sendEmail, setSendEmail] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [lastLink, setLastLink] = React.useState<string | null>(null);

  async function onCreateInvite() {
    setPending(true);
    setLastLink(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          dealId: scope === "deal" ? props.dealId : undefined,
          email: email.trim() || undefined,
          message: message.trim() || undefined,
          expiresInDays: Number(expiresInDays) || 14,
          sendEmail,
        }),
      });
      const data = (await res.json()) as {
        inviteUrl?: string;
        inviteToken?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Invite failed");
      if (data.inviteUrl) {
        setLastLink(data.inviteUrl);
        await navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
        toast.success("Invite created — link copied to clipboard.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div>
        <p className="text-sm font-medium">Invite an investor</p>
        <p className="text-xs text-muted-foreground">
          They join as read-only investor access ({scope === "deal" ? "this deal & linked data rooms" : "whole organization"}).
        </p>
      </div>
      <div className="space-y-2">
        <Label>Access scope</Label>
        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deal">This deal only</SelectItem>
            <SelectItem value="org">Full investor portal (all deals)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-email">Recipient email (optional)</Label>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="investor@example.com"
          className="max-w-md"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-msg">Note (optional)</Label>
        <Textarea
          id="invite-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Short welcome message..."
          className="max-w-lg"
        />
      </div>
      <div className="flex max-w-xs flex-col gap-2">
        <Label htmlFor="invite-expires">Expires in (days)</Label>
        <Input
          id="invite-expires"
          type="number"
          min={1}
          max={90}
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
        Send invitation email via Resend (needs recipient email above)
      </label>
      <Button type="button" size="sm" disabled={pending} onClick={() => void onCreateInvite()}>
        {pending ? "Creating…" : "Generate invite"}
      </Button>
      {lastLink ? (
        <p className="break-all text-xs text-muted-foreground">
          Link:{" "}
          <a href={lastLink} className="font-mono text-foreground underline underline-offset-2">
            {lastLink}
          </a>
        </p>
      ) : null}
    </div>
  );
}
