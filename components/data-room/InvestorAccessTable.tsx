"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { InviteRow } from "@/lib/data-room/server-queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";

type Props = {
  invitations: InviteRow[];
  selectedDealId?: string;
  selectedRoomId?: string;
};

type OrgMemberOption = {
  userId: string;
  role: string;
  email?: string;
  displayName?: string;
};

function inviteStatus(inv: InviteRow, now: number) {
  if (inv.revokedAt) return "Revoked" as const;
  if (inv.acceptedAt) return "Accepted" as const;
  if (inv.expiresAt < now) return "Expired" as const;
  return "Invited" as const;
}

function displayName(inv: InviteRow): string {
  if (inv.email) {
    const local = inv.email.split("@")[0] ?? inv.email;
    return local.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Open link";
}

function memberPickLabel(m: OrgMemberOption): string {
  return m.displayName?.trim() || m.email?.trim() || m.userId.slice(0, 8);
}

export function InvestorAccessTable(props: Props) {
  const router = useRouter();
  const mounted = useMounted();
  const now = Date.now();
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const [messageTarget, setMessageTarget] = React.useState<InviteRow | null>(null);
  const [messageSubject, setMessageSubject] = React.useState("");
  const [messageBody, setMessageBody] = React.useState("");
  const [sendingMessage, setSendingMessage] = React.useState(false);

  const [assignTarget, setAssignTarget] = React.useState<InviteRow | null>(null);
  const [assignOwnerUid, setAssignOwnerUid] = React.useState<string>("");
  const [orgMembers, setOrgMembers] = React.useState<OrgMemberOption[]>([]);
  const [membersLoading, setMembersLoading] = React.useState(false);
  const [assignSaving, setAssignSaving] = React.useState(false);

  const [readmitTarget, setReadmitTarget] = React.useState<InviteRow | null>(null);
  const [readmitSendEmail, setReadmitSendEmail] = React.useState(true);
  const [readmitSaving, setReadmitSaving] = React.useState(false);

  React.useEffect(() => {
    if (!assignTarget) return;
    let cancelled = false;
    setMembersLoading(true);
    setOrgMembers([]);
    setAssignOwnerUid("");
    void (async () => {
      try {
        const res = await fetch("/api/organizations/members");
        const json = (await res.json()) as { members?: OrgMemberOption[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not load team");
        if (!cancelled) setOrgMembers(json.members ?? []);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Could not load team");
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignTarget]);

  function busy(inv: InviteRow, op: string) {
    return busyKey === `${inv.id}:${op}`;
  }

  async function revokeAccess(inv: InviteRow) {
    const st = inviteStatus(inv, Date.now());
    if (st === "Revoked") return;
    const hint =
      inv.scope === "deal"
        ? "They lose access to the deals and data rooms tied to this invitation, and the link stops working."
        : "This revokes the invite link only. Accepted org-wide guests can still reach the portal until their membership is removed in Platform Admin.";
    if (
      !window.confirm(
        `Remove access for ${inv.email ?? displayName(inv)}?\n\n${hint}`,
      )
    )
      return;
    setBusyKey(`${inv.id}:revoke`);
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(inv.id)}/revoke`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        error?: string;
        orgScopeNote?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      toast.success("Invitation revoked");
      if (json.orgScopeNote) toast.message(json.orgScopeNote, { duration: 8000 });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove access");
    } finally {
      setBusyKey(null);
    }
  }

  async function resendInvite(inv: InviteRow) {
    setBusyKey(`${inv.id}:resend`);
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(inv.id)}/resend`, {
        method: "POST",
      });
      const json = (await res.json()) as { error?: string; mode?: string };
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      toast.success(json.mode === "reminder" ? "Reminder sent" : "Invitation email sent with a fresh link");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setBusyKey(null);
    }
  }

  function openSendMessage(inv: InviteRow) {
    setMessageSubject("");
    setMessageBody("");
    setMessageTarget(inv);
  }

  async function submitMessage() {
    if (!messageTarget) return;
    const body = messageBody.trim();
    if (!body) {
      toast.error("Enter a message");
      return;
    }
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(messageTarget.id)}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          ...(messageSubject.trim() ? { subject: messageSubject.trim() } : {}),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      toast.success("Message sent");
      setMessageTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSendingMessage(false);
    }
  }

  async function patchInvestor(inv: InviteRow, action: "mark_warm" | "move_docs_sent" | "move_committed") {
    setBusyKey(`${inv.id}:${action}`);
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(inv.id)}/investor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      toast.success("CRM updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusyKey(null);
    }
  }

  async function submitReadmit() {
    if (!readmitTarget) return;
    setReadmitSaving(true);
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(readmitTarget.id)}/readmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail: readmitSendEmail }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        inviteUrl?: string;
        warning?: string;
        emailSent?: boolean;
      };
      if (!json.inviteUrl) {
        throw new Error(json.error ?? "Readmit failed");
      }

      try {
        await navigator.clipboard.writeText(json.inviteUrl);
        toast.success(json.emailSent === true ? "Readmitted — email sent and link copied." : "Readmitted — new link copied.");
      } catch {
        toast.success(json.emailSent === true ? "Readmitted — email sent." : "Readmitted.");
      }
      if (json.warning) toast.message(json.warning, { duration: 9000 });

      setReadmitTarget(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not readmit");
    } finally {
      setReadmitSaving(false);
    }
  }

  async function submitAssignOwner() {
    if (!assignTarget || !assignOwnerUid) {
      toast.error("Choose a team member");
      return;
    }
    setAssignSaving(true);
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(assignTarget.id)}/investor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign_owner", ownerUserId: assignOwnerUid }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      toast.success("Owner assigned");
      setAssignTarget(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign");
    } finally {
      setAssignSaving(false);
    }
  }

  let rows = props.invitations;
  if (props.selectedRoomId) {
    rows = rows.filter((inv) => inv.dataRoomIds.length === 0 || inv.dataRoomIds.includes(props.selectedRoomId!));
  }
  if (props.selectedDealId) {
    rows = rows.filter(
      (inv) => inv.scope === "deal" && inv.dealIds.includes(props.selectedDealId!),
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <Table zebra>
          <TableHeader>
            <TableRow>
              <TableHead>Investor</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead>Invite status</TableHead>
              <TableHead className="hidden md:table-cell">NDA status</TableHead>
              <TableHead className="hidden lg:table-cell">Last seen</TableHead>
              <TableHead className="hidden xl:table-cell">Docs viewed</TableHead>
              <TableHead className="hidden xl:table-cell">Commitment</TableHead>
              <TableHead className="hidden lg:table-cell">Stage</TableHead>
              <TableHead className="hidden 2xl:table-cell">Owner</TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                  {props.selectedDealId
                    ? "No invitations for this deal yet. Use Invite investor in the header."
                    : "Pick a deal filter to narrow invitations, or review all rows below."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((inv) => {
                const st = inviteStatus(inv, now);
                const hasEmail = Boolean(inv.email?.trim());
                const resendOk = st !== "Revoked" && hasEmail;
                const crmOk = st === "Accepted" && hasEmail && !inv.revokedAt;
                const rowBusy = Boolean(busyKey?.startsWith(`${inv.id}:`));
                return (
                  <TableRow key={inv.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">{displayName(inv)}</TableCell>
                    <TableCell className="hidden max-w-[200px] truncate text-muted-foreground sm:table-cell">
                      {inv.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={st === "Accepted" ? "default" : "secondary"}
                        className="rounded-full text-[10px] capitalize"
                      >
                        {st}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {inv.ndaSignedAt ? (
                        <span title={mounted ? new Date(inv.ndaSignedAt).toLocaleString() : undefined}>
                          {mounted ? `Signed ${new Date(inv.ndaSignedAt).toLocaleDateString()}` : "Signed"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      —
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                      —
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                      —
                    </TableCell>
                    <TableCell className="hidden text-xs capitalize text-muted-foreground lg:table-cell">
                      {st === "Accepted" ? "Active" : "Invite"}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground 2xl:table-cell">
                      —
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:bg-muted",
                          )}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[min(18rem,calc(100vw-2rem))] rounded-xl">
                          {st === "Revoked" ? (
                            <>
                              <DropdownMenuItem
                                disabled={rowBusy}
                                onClick={() => {
                                  setReadmitSendEmail(Boolean(inv.email?.trim()));
                                  setReadmitTarget(inv);
                                }}
                              >
                                Readmit investor…
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          ) : null}
                          <DropdownMenuItem
                            disabled={st === "Revoked" || rowBusy}
                            className={
                              st !== "Revoked"
                                ? "text-destructive focus:text-destructive"
                                : undefined
                            }
                            onClick={() => void revokeAccess(inv)}
                          >
                            {busy(inv, "revoke") ? "Removing…" : "Remove investor access"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={!resendOk || rowBusy}
                            onClick={() => void resendInvite(inv)}
                          >
                            {busy(inv, "resend")
                              ? "Sending…"
                              : st === "Accepted"
                                ? "Send portal reminder"
                                : "Resend invitation email"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!hasEmail || st === "Revoked"}
                            onClick={() => openSendMessage(inv)}
                          >
                            Send message…
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!inv.ndaEnvelopeId}
                            onClick={() => {
                              if (!inv.ndaEnvelopeId) return;
                              window.open(
                                `/api/esign/envelopes/${encodeURIComponent(inv.ndaEnvelopeId)}/final-document`,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }}
                          >
                            Download signed NDA
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!crmOk || rowBusy}
                            onClick={() => void patchInvestor(inv, "mark_warm")}
                          >
                            {busy(inv, "mark_warm") ? "Updating…" : "Mark warm"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!crmOk || rowBusy}
                            onClick={() => setAssignTarget(inv)}
                          >
                            Assign owner…
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!crmOk || rowBusy}
                            onClick={() => void patchInvestor(inv, "move_docs_sent")}
                          >
                            {busy(inv, "move_docs_sent") ? "Updating…" : "Move to Docs sent"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!crmOk || rowBusy}
                            onClick={() => void patchInvestor(inv, "move_committed")}
                          >
                            {busy(inv, "move_committed") ? "Updating…" : "Move to Committed"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
          Showing {rows.length} invitation{rows.length === 1 ? "" : "s"}
          {props.selectedDealId ? " for the selected deal" : ""}. CRM-linked metrics (last seen, docs, commitment)
          appear when guest accounts merge with investor records.
        </p>
      </div>

      <Dialog
        open={readmitTarget !== null}
        onOpenChange={(o) => {
          if (!o) setReadmitTarget(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Readmit investor</DialogTitle>
            <DialogDescription>
              Opens this invitation again: a new acceptance link is created and the investor must redeem it (sign in as the
              same email) to get deal/data room access back. Removing them cleared both the invite link and membership.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {readmitTarget?.email?.trim() ? (
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <Checkbox
                  checked={readmitSendEmail}
                  onCheckedChange={(v) => setReadmitSendEmail(v === true)}
                  className="mt-0.5"
                />
                <span>
                  Email the new invitation to <span className="font-medium">{readmitTarget.email}</span> (requires{" "}
                  <span className="font-mono text-xs">RESEND_API_KEY</span>). The invite link will also be copied on
                  success.
                </span>
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">
                This row has no email — the invite link will be copied only after readmit.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setReadmitTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={readmitSaving}
              onClick={() => void submitReadmit()}
            >
              {readmitSaving ? "Working…" : "Readmit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={messageTarget !== null} onOpenChange={(o) => !o && setMessageTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message investor</DialogTitle>
            <DialogDescription>
              Email via Resend to {messageTarget?.email ?? "recipient"}. Replies use your CapitalOS login email when
              available.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="inv-msg-subj">Subject (optional)</Label>
              <Input
                id="inv-msg-subj"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Quick note…"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-msg-body">Message</Label>
              <Textarea
                id="inv-msg-body"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="min-h-[120px] rounded-xl"
                placeholder="Write your note…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setMessageTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={sendingMessage}
              onClick={() => void submitMessage()}
            >
              {sendingMessage ? "Sending…" : "Send email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignTarget !== null} onOpenChange={(o) => !o && setAssignTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign relationship owner</DialogTitle>
            <DialogDescription>
              Updates the CRM investor tied to this invitation. Team members only — not investor guests.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {membersLoading ? (
              <p className="text-sm text-muted-foreground">Loading team…</p>
            ) : orgMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No eligible team members found.</p>
            ) : (
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select
                  value={assignOwnerUid || undefined}
                  onValueChange={(v) => setAssignOwnerUid(v ?? "")}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choose teammate" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgMembers.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.email ? `${memberPickLabel(m)} (${m.email})` : memberPickLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setAssignTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={assignSaving || !assignOwnerUid || membersLoading}
              onClick={() => void submitAssignOwner()}
            >
              {assignSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
