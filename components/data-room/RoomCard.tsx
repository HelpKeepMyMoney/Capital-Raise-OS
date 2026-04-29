"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SerializedDataRoom, SerializedDealLite } from "@/components/data-room/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Archive, BarChart3, FolderOpen, Link2, Pencil } from "lucide-react";

type Props = {
  room: SerializedDataRoom;
  selected: boolean;
  onSelect: () => void;
  docCount: number;
  invitedHint?: number;
  viewsWeek?: number;
  deal?: SerializedDealLite | null;
  canManage: boolean;
  /** Filter context: spotlight when deal ids match selected deal filter */
  dealFilterId?: string;
  onInvite?: () => void;
  /** Copy filtered data room URL (deal-scoped when linked). */
  onCopyInviteLink?: () => void;
  /** Open workspace Activity tab for this room. */
  onOpenAnalytics?: () => void;
};

function statusBadges(room: SerializedDataRoom) {
  const badges: { label: string; variant?: "secondary" | "default" | "outline" | "destructive" }[] = [];
  if (room.archived) badges.push({ label: "Archived", variant: "secondary" });
  else if (room.visibility === "invite_only") badges.push({ label: "Invite only", variant: "outline" });
  if (room.ndaRequired && !badges.some((b) => b.label === "Archived")) {
    badges.push({ label: "NDA", variant: "default" });
  }
  if (!badges.some((b) => b.label === "NDA") && !room.archived && room.visibility !== "invite_only") {
    badges.push({ label: "Open", variant: "outline" });
  }
  return badges;
}

export function RoomCard(props: Props) {
  const { room, selected } = props;
  const badges = statusBadges(room);
  const updated = room.updatedAt ?? room.createdAt;
  const mismatch =
    props.dealFilterId && props.room.dealId && props.room.dealId !== props.dealFilterId;

  return (
    <Card
      className={cn(
        "cursor-pointer rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
        selected ? "border-primary ring-2 ring-primary/25" : "border-border bg-card shadow-sm",
        mismatch ? "opacity-55" : "",
      )}
      onClick={props.onSelect}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight text-foreground">{room.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {props.deal ? props.deal.name : room.dealId ? "Deal linked" : "No deal linked"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              props.onSelect();
            }}
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <Badge key={b.label + (b.variant ?? "")} variant={b.variant ?? "secondary"} className="text-[10px] font-medium">
              {b.label}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {props.docCount} Docs ·{" "}
          {typeof props.invitedHint === "number" ? `${props.invitedHint} invites` : "— invites"} ·{" "}
          {props.viewsWeek != null ? `${props.viewsWeek} room views est.` : "— views"}
        </p>
        {updated ? (
          <p className="text-[11px] text-muted-foreground">
            Updated {formatDistanceToNow(updated, { addSuffix: true })}
          </p>
        ) : null}

        {props.canManage ? (
          <div className="flex flex-wrap gap-1 border-t border-border pt-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 flex-1 rounded-lg text-xs min-w-[4.5rem]"
              onClick={(e) => {
                e.stopPropagation();
                props.onSelect();
              }}
            >
              Open
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2"
              title="Copy link to data room (deal-scoped)"
              onClick={(e) => {
                e.stopPropagation();
                props.onCopyInviteLink?.();
              }}
            >
              <Link2 className="h-3.5 w-3.5" />
              <span className="sr-only">Copy invite link</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2"
              title="Activity"
              onClick={(e) => {
                e.stopPropagation();
                props.onOpenAnalytics?.();
              }}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="sr-only">Analytics</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2"
              aria-label="Edit via settings tab"
              onClick={(e) => {
                e.stopPropagation();
                props.onSelect();
              }}
              title="Open room, then use Settings tab"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2"
              disabled={props.room.archived}
              title="Archived rooms cannot invite"
              onClick={(e) => {
                e.stopPropagation();
                props.onInvite?.();
              }}
            >
              Invite
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-2" aria-label="Archive" disabled title="Coming soon via settings">
              <Archive className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
