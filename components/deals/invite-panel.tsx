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

/** Enhanced invite panel; NDA / reminder are surfaced in UI (enforce NDA via linked data room). */
export function InvitePanel(props: { dealId: string }) {
  const [scope, setScope] = React.useState<Scope>("deal");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [expiresInDays, setExpiresInDays] = React.useState("14");
  const [sendEmail, setSendEmail] = React.useState(false);
  const [ndaRequired, setNdaRequired] = React.useState(false);
  const [autoFollowUp, setAutoFollowUp] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [lastLink, setLastLink] = React.useState<string | null>(null);

  function buildMessage(): string | undefined {
    const parts: string[] = [];
    if (message.trim()) parts.push(message.trim());
    if (ndaRequired) parts.push("[Sponsor note: data room may require NDA before access.]");
    if (autoFollowUp) parts.push("[Auto follow-up reminder requested — configure in your workflow.]");
    const joined = parts.join("\n\n");
    return joined || undefined;
  }

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
          message: buildMessage(),
          expiresInDays: Number(expiresInDays) || 14,
          sendEmail,
        }),
      });
      const data = (await res.json()) as {
        inviteUrl?: string;
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

  function copyLink() {
    if (!lastLink) return;
    void navigator.clipboard.writeText(lastLink);
    toast.success("Link copied.");
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
      <div>
        <p className="font-medium">Invite investors</p>
        <p className="text-xs text-muted-foreground">
          Recipients join with read-only access to this deal and linked data rooms.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Access scope</Label>
        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger className="max-w-md rounded-xl">
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deal">This deal only</SelectItem>
            <SelectItem value="org">Full investor portal (all deals)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="inv-email">Recipient email</Label>
        <Input
          id="inv-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="investor@example.com"
          className="max-w-md rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inv-note">Welcome note</Label>
        <Textarea
          id="inv-note"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Short personal note…"
          className="max-w-2xl rounded-xl"
        />
      </div>
      <div className="grid max-w-xs gap-2">
        <Label htmlFor="inv-exp">Expiration (days)</Label>
        <Input
          id="inv-exp"
          type="number"
          min={1}
          max={90}
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(e.target.value)}
          className="rounded-xl"
        />
      </div>
      <div className="flex flex-col gap-3 text-sm">
        <label className="flex items-center gap-2">
          <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
          Send invitation email via Resend (requires recipient email)
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={ndaRequired} onCheckedChange={(v) => setNdaRequired(v === true)} />
          NDA required (note added to invite; enforce via data room)
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={autoFollowUp} onCheckedChange={(v) => setAutoFollowUp(v === true)} />
          Auto follow-up reminder (note only — automation roadmap)
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => void onCreateInvite()}
          className="rounded-xl"
        >
          {pending ? "Sending…" : "Send invite"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={!lastLink}
          onClick={copyLink}
        >
          Copy secure link
        </Button>
      </div>
      {lastLink ? (
        <p className="break-all text-xs text-muted-foreground">
          <a href={lastLink} className="text-foreground underline underline-offset-2">
            {lastLink}
          </a>
        </p>
      ) : null}
    </div>
  );
}
