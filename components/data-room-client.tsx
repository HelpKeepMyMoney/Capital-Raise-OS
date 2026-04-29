"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { RoomDocument } from "@/lib/firestore/types";
import { Pencil, Trash2 } from "lucide-react";

export type DataRoomRow = {
  id: string;
  name: string;
  ndaRequired: boolean;
};

export type DocumentRow = {
  id: string;
  name: string;
  kind: string;
  dataRoomId: string;
  viewCount?: number;
};

const DOC_KINDS: RoomDocument["kind"][] = ["deck", "model", "ppm", "video", "legal", "other"];

function kindLabel(k: string) {
  return k.replace("_", " ");
}

type Props = {
  rooms: DataRoomRow[];
  documents: DocumentRow[];
  canManage: boolean;
};

export function DataRoomClient(props: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [roomName, setRoomName] = React.useState("");
  const [ndaRequired, setNdaRequired] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const [selectedRoomId, setSelectedRoomId] = React.useState(
    () => props.rooms[0]?.id ?? "",
  );
  React.useEffect(() => {
    if (props.rooms.length && !props.rooms.some((r) => r.id === selectedRoomId)) {
      setSelectedRoomId(props.rooms[0]!.id);
    }
  }, [props.rooms, selectedRoomId]);

  const [kind, setKind] = React.useState<RoomDocument["kind"]>("deck");
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editDocId, setEditDocId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editRoomId, setEditRoomId] = React.useState("");
  const [editKindState, setEditKindState] = React.useState<RoomDocument["kind"]>("deck");
  const [savingDoc, setSavingDoc] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<DocumentRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const roomNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of props.rooms) m.set(r.id, r.name);
    return m;
  }, [props.rooms]);

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
        body: JSON.stringify({ name, ndaRequired }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create room");
      toast.success("Data room created");
      setRoomName("");
      setNdaRequired(false);
      setCreateOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create room");
    } finally {
      setCreating(false);
    }
  }

  async function uploadDocument() {
    if (!selectedRoomId) {
      toast.error("Create a data room first");
      return;
    }
    if (!file) {
      toast.error("Choose a file");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("dataRoomId", selectedRoomId);
      fd.set("kind", kind);
      const res = await fetch("/api/data-room/documents", { method: "POST", body: fd });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      toast.success("Document uploaded");
      setFile(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function beginEdit(doc: DocumentRow) {
    setEditDocId(doc.id);
    setEditName(doc.name);
    setEditRoomId(doc.dataRoomId);
    setEditKindState(doc.kind as RoomDocument["kind"]);
    setEditOpen(true);
  }

  async function saveDocumentEdit() {
    const name = editName.trim();
    if (!editDocId || !name) {
      toast.error("Name is required");
      return;
    }
    setSavingDoc(true);
    try {
      const res = await fetch(`/api/data-room/documents/${editDocId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          dataRoomId: editRoomId,
          kind: editKindState,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      toast.success("Document updated");
      setEditOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingDoc(false);
    }
  }

  async function confirmDeleteDocument() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/data-room/documents/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete");
      toast.success("Document removed");
      setDeleteTarget(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

  /** Open popup synchronously so the browser doesn’t block it after `await fetch`. */
  async function openDocument(documentId: string) {
    const popup = window.open("about:blank", "_blank", "noopener,noreferrer");
    try {
      const res = await fetch("/api/data-room/sign-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not open file");
      if (popup) popup.location.href = data.url;
      else window.location.href = data.url;
    } catch (e) {
      popup?.close();
      toast.error(e instanceof Error ? e.message : "Could not open file");
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Rooms</CardTitle>
          {props.canManage ? (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
                New room
              </Button>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create data room</DialogTitle>
                  <DialogDescription>
                    Investors see documents grouped by room. Enable NDA if you gate access behind a
                    signed agreement (workflow coming soon).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="room-name">Name</Label>
                    <Input
                      id="room-name"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="Series A — diligence"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={ndaRequired}
                      onCheckedChange={(v) => setNdaRequired(v === true)}
                    />
                    NDA required (label only for now)
                  </label>
                </div>
                <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void createRoom()} disabled={creating}>
                    {creating ? "Creating…" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {props.rooms.length === 0 ? (
            <p className="text-muted-foreground">
              {props.canManage
                ? "No rooms yet — create one to organize documents for investors."
                : "No rooms shared with your account yet."}
            </p>
          ) : (
            props.rooms.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <span>{r.name}</span>
                {r.ndaRequired ? <Badge>NDA</Badge> : <Badge variant="secondary">Open</Badge>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {props.canManage ? (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">Upload</p>
              <div className="space-y-2">
                <Label>Room</Label>
                <Select
                  value={selectedRoomId}
                  onValueChange={(v) => setSelectedRoomId(v ?? "")}
                  disabled={props.rooms.length === 0}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={kind}
                  onValueChange={(v) => v && setKind(v as RoomDocument["kind"])}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {kindLabel(k)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-file">File</Label>
                <Input
                  id="doc-file"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={props.rooms.length === 0}
                />
              </div>
              <Button
                className="w-full sm:w-auto"
                onClick={() => void uploadDocument()}
                disabled={uploading || props.rooms.length === 0}
              >
                {uploading ? "Uploading…" : "Upload document"}
              </Button>
            </div>
          ) : null}

          {props.documents.length === 0 ? (
            <p className="text-muted-foreground">
              {props.canManage
                ? "Uploaded files appear here with view counts. Max 50MB per file."
                : "No documents in this organization yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {props.documents.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="capitalize">{kindLabel(d.kind)}</span>
                      {roomNameById.get(d.dataRoomId) ? (
                        <> · {roomNameById.get(d.dataRoomId)}</>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">{d.viewCount ?? 0} views</span>
                    {props.canManage ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Edit ${d.name}`}
                          title="Edit"
                          onClick={() => beginEdit(d)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Delete ${d.name}`}
                          title="Delete"
                          onClick={() => setDeleteTarget(d)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : null}
                    <Button type="button" size="sm" variant="outline" onClick={() => void openDocument(d.id)}>
                      Open
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
            <DialogDescription>Update title, room, or document type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-doc-name">Name</Label>
              <Input
                id="edit-doc-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Document name"
              />
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={editRoomId} onValueChange={(v) => setEditRoomId(v ?? "")}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {props.rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editKindState} onValueChange={(v) => v && setEditKindState(v as RoomDocument["kind"])}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {kindLabel(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveDocumentEdit()} disabled={savingDoc || props.rooms.length === 0}>
              {savingDoc ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” will be removed from the data room and storage. This cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDeleteDocument()} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
