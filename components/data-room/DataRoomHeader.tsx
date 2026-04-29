"use client";

import { Button } from "@/components/ui/button";
import { FolderPlus, UserPlus, Upload } from "lucide-react";
type Props = {
  canManage: boolean;
  onNewRoom: () => void;
  onInvite: () => void;
  /** Scroll / focus upload in workspace */
  onUpload: () => void;
};

export function DataRoomHeader(props: Props) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Data Room</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Secure investor portal for diligence, permissions, NDA access, and engagement analytics.
        </p>
      </div>
      {props.canManage ? (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2 rounded-xl border-border bg-card shadow-sm" onClick={props.onInvite}>
            <UserPlus className="h-4 w-4" />
            Invite investor
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl border-border bg-card shadow-sm" onClick={props.onUpload}>
            <Upload className="h-4 w-4" />
            Upload files
          </Button>
          <Button className="gap-2 rounded-xl shadow-sm" onClick={props.onNewRoom}>
            <FolderPlus className="h-4 w-4" />
            New room
          </Button>
        </div>
      ) : null}
    </div>
  );
}
