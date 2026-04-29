"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataRoomHeader } from "@/components/data-room/DataRoomHeader";
import { RoomMetrics } from "@/components/data-room/RoomMetrics";
import { RoomCard } from "@/components/data-room/RoomCard";
import { RoomWorkspace } from "@/components/data-room/RoomWorkspace";
import { DataRoomCopilot } from "@/components/data-room/DataRoomCopilot";
import type { SerializedDataRoom, SerializedRoomDocument, SerializedDealLite } from "@/components/data-room/types";
import type { DataRoomMetricsDTO } from "@/lib/data-room/metrics";
import type { InviteRow, ActivityFeedItemDTO } from "@/lib/data-room/server-queries";
import type { Deal } from "@/lib/firestore/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  rooms: SerializedDataRoom[];
  documents: SerializedRoomDocument[];
  deals: SerializedDealLite[];
  roomDealMap: Record<string, Deal | null>;
  metrics: DataRoomMetricsDTO;
  invitations: InviteRow[];
  activityPreview: ActivityFeedItemDTO[];
  canManage: boolean;
};

export function DataRoomShell(props: Props) {
  const router = useRouter();
  const wsRef = React.useRef<HTMLDivElement>(null);

  const [dealFilterId, setDealFilterId] = React.useState<string>("");
  const [searchRooms, setSearchRooms] = React.useState("");

  const [selectedRoomId, setSelectedRoomId] = React.useState(props.rooms[0]?.id ?? "");
  React.useEffect(() => {
    if (props.rooms.length && !props.rooms.some((r) => r.id === selectedRoomId)) {
      setSelectedRoomId(props.rooms[0]!.id);
    }
  }, [props.rooms, selectedRoomId]);

  const filteredRoomsBase = React.useMemo(() => {
    let rs = props.rooms.filter((r) => !r.archived);
    if (dealFilterId) rs = rs.filter((r) => r.dealId === dealFilterId);
    const q = searchRooms.trim().toLowerCase();
    if (q) rs = rs.filter((r) => r.name.toLowerCase().includes(q));
    return rs;
  }, [props.rooms, dealFilterId, searchRooms]);

  const selectedRoom = props.rooms.find((r) => r.id === selectedRoomId);

  const dealForRoom = selectedRoom?.dealId ? props.roomDealMap[selectedRoom.dealId] ?? null : null;

  const documentsForRoom = props.documents.filter((d) => d.dataRoomId === selectedRoomId);

  const roomSelectList = props.rooms.map((r) => ({ id: r.id, name: r.name }));

  const statsByRoomId = React.useMemo(() => {
    const map = new Map<string, { docCount: number; views: number }>();
    for (const r of props.rooms) {
      map.set(r.id, { docCount: 0, views: 0 });
    }
    for (const d of props.documents) {
      if (!d.dataRoomId) continue;
      const prev = map.get(d.dataRoomId) ?? { docCount: 0, views: 0 };
      map.set(d.dataRoomId, {
        docCount: prev.docCount + 1,
        views: prev.views + (d.viewCount ?? 0),
      });
    }
    return map;
  }, [props.documents, props.rooms]);

  function inviteHintForDeal(dealId?: string): number | undefined {
    const did = dealId ?? dealFilterId;
    if (!did) return undefined;
    return props.invitations.filter(
      (i) => !i.revokedAt && (!i.expiresAt || i.expiresAt > Date.now()) && i.scope === "deal" && i.dealIds.includes(did),
    ).length;
  }

  /** Create room modal */
  const [createOpen, setCreateOpen] = React.useState(false);
  const [roomName, setRoomName] = React.useState("");
  const [ndaRequired, setNdaRequired] = React.useState(false);
  const [createDealId, setCreateDealId] = React.useState<string>("");
  const [creating, setCreating] = React.useState(false);

  async function createRoom() {
    const name = roomName.trim();
    if (!name) {
      toast.error("Enter a room name");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/data-room/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ndaRequired,
          dealId: createDealId || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create room");
      toast.success("Data room created");
      setRoomName("");
      setNdaRequired(false);
      setCreateDealId("");
      setCreateOpen(false);
      if (data.id) setSelectedRoomId(data.id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create room");
    } finally {
      setCreating(false);
    }
  }

  /** Invite — deal scope only */
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteDealId, setInviteDealId] = React.useState("");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteMessage, setInviteMessage] = React.useState("");
  const [inviteSendEmail, setInviteSendEmail] = React.useState(false);
  const [inviting, setInviting] = React.useState(false);

  async function sendInvite() {
    if (!inviteDealId) {
      toast.error("Choose a deal to attach this invitation.");
      return;
    }
    if (inviteSendEmail && !inviteEmail.trim()) {
      toast.error("Email required when Send email is checked.");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "deal",
          dealId: inviteDealId,
          email: inviteEmail.trim() || undefined,
          message: inviteMessage.trim() || undefined,
          sendEmail: inviteSendEmail,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        inviteUrl?: string;
        inviteToken?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Invite failed");
      toast.success("Invitation created");
      if (data.inviteUrl) {
        try {
          await navigator.clipboard.writeText(data.inviteUrl);
          toast.message("Invite link copied to clipboard");
        } catch {
          /* ignore */
        }
      }
      setInviteOpen(false);
      setInviteEmail("");
      setInviteMessage("");
      setInviteSendEmail(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  const metricsSummary = `${props.metrics.activeRooms} active rooms; ${props.metrics.totalDocuments} docs; ${props.metrics.investorViewsThisWeek} opens this week; ${props.metrics.invitedInvestorsCount} invitations.`;

  return (
    <div className="space-y-8">
      <DataRoomHeader
        canManage={props.canManage}
        onNewRoom={() => setCreateOpen(true)}
        onInvite={() => {
          setInviteDealId(dealFilterId || selectedRoom?.dealId || props.deals[0]?.id || "");
          setInviteOpen(true);
        }}
        onUpload={() => wsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />

      <RoomMetrics metrics={props.metrics} />

      <div ref={wsRef} className="grid gap-6 lg:grid-cols-[minmax(280px,340px),minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Search rooms</Label>
              <Input
                value={searchRooms}
                onChange={(e) => setSearchRooms(e.target.value)}
                placeholder="Filter by name…"
                className="rounded-xl border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Align to deal</Label>
              <Select
                value={dealFilterId || "__all"}
                onValueChange={(v) =>
                  setDealFilterId(typeof v === "string" ? (v === "__all" ? "" : v) : "")
                }
              >
                <SelectTrigger className="rounded-xl border-border">
                  <SelectValue placeholder="All deals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All deals</SelectItem>
                  {props.deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Deal alignment controls which rooms appear here and invitation pre-selects for that deal.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {filteredRoomsBase.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                No rooms match this filter — create one or widen the deal filter.
              </div>
            ) : (
              filteredRoomsBase.map((r) => {
                const stats = statsByRoomId.get(r.id) ?? { docCount: 0, views: 0 };
                const deal = r.dealId ? props.roomDealMap[r.dealId] : null;
                return (
                  <RoomCard
                    key={r.id}
                    room={r}
                    selected={selectedRoomId === r.id}
                    onSelect={() => setSelectedRoomId(r.id)}
                    docCount={stats.docCount}
                    invitedHint={inviteHintForDeal(r.dealId)}
                    viewsWeek={stats.views}
                    deal={deal ? { id: deal.id, name: deal.name, targetRaise: deal.targetRaise, minimumInvestment: deal.minimumInvestment, closeDate: deal.closeDate, status: deal.status } : null}
                    canManage={props.canManage}
                    dealFilterId={dealFilterId || undefined}
                    onInvite={() => {
                      if (r.dealId) setInviteDealId(r.dealId);
                      setInviteOpen(true);
                    }}
                  />
                );
              })
            )}
          </div>
        </aside>

        <section className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6">
          {!selectedRoom ? (
            <p className="text-sm text-muted-foreground">Select a room to open the workspace.</p>
          ) : (
            <>
              <div className="flex flex-col gap-1 border-b border-border pb-4">
                <h2 className="text-xl font-semibold tracking-tight">{selectedRoom.name}</h2>
                {selectedRoom.dealId && !dealForRoom ? (
                  <p className="text-xs text-amber-600">Deal link missing or deal was removed — update in Settings.</p>
                ) : null}
                {!selectedRoom.dealId && props.canManage ? (
                  <p className="text-xs text-muted-foreground">Tip: associate a deal in Settings to unlock investor preview and invite routing.</p>
                ) : null}
              </div>
              <RoomWorkspace
                room={selectedRoom}
                documentsForRoom={documentsForRoom}
                deals={props.deals}
                invitations={props.invitations}
                activityPreview={props.activityPreview}
                dealForRoom={dealForRoom}
                canManage={props.canManage}
                selectedDealId={dealFilterId || selectedRoom.dealId}
                roomSelectList={roomSelectList}
              />
            </>
          )}
        </section>
      </div>

      {selectedRoom ? (
        <DataRoomCopilot roomName={selectedRoom.name} roomId={selectedRoom.id} metricsSummary={metricsSummary} />
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create data room</DialogTitle>
            <DialogDescription>Organize diligence materials; link a deal to align invites and preview.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cr-name">Name</Label>
              <Input
                id="cr-name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Series A — diligence"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Deal (optional)</Label>
              <Select
                value={createDealId || "__none"}
                onValueChange={(v) =>
                  setCreateDealId(typeof v === "string" ? (v === "__none" ? "" : v) : "")
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select deal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {props.deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={ndaRequired} onCheckedChange={(v) => setNdaRequired(v === true)} />
              NDA required before access (workflow-ready)
            </label>
          </div>
          <DialogFooter className="border-0">
            <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" disabled={creating} onClick={() => void createRoom()}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Invite investor</DialogTitle>
            <DialogDescription>
              Deal-scoped invitation — includes data rooms tagged with this deal. Copy the link or email it from CPIN.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Deal</Label>
              <Select value={inviteDealId || ""} onValueChange={(v) => setInviteDealId(typeof v === "string" ? v : "")}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select deal (required)" />
                </SelectTrigger>
                <SelectContent>
                  {props.deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-email">Email (optional unless sending)</Label>
              <Input
                id="inv-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="rounded-xl"
                placeholder="investor@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-msg">Message</Label>
              <Textarea
                id="inv-msg"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="min-h-[80px] rounded-xl"
                placeholder="Short personal note (optional)"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={inviteSendEmail} onCheckedChange={(v) => setInviteSendEmail(v === true)} />
              Send email via Resend (requires API key)
            </label>
          </div>
          <DialogFooter className="border-0">
            <Button variant="outline" className="rounded-xl" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" disabled={inviting} onClick={() => void sendInvite()}>
              {inviting ? "Creating…" : "Create invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
