"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SerializedRoomDocument } from "@/components/data-room/types";
import { DATA_ROOM_KIND_OPTIONS, kindLabel } from "@/lib/data-room/kind-labels";
import type { RoomDocument as RoomDocType } from "@/lib/firestore/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UploadZone } from "@/components/data-room/UploadZone";
import { FolderPlus, Layers, MoreHorizontal, Pencil, Upload, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function formatBytes(n?: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

type Props = {
  documents: SerializedRoomDocument[];
  selectedRoomId: string;
  canManage: boolean;
  uploading: boolean;
  uploadProgress?: number | null;
  /** Room list for move-to-room */
  rooms: { id: string; name: string }[];
};

export function DocumentManager(props: Props) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [kind, setKind] = React.useState<RoomDocType["kind"]>("deck");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editDocId, setEditDocId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editRoomId, setEditRoomId] = React.useState("");
  const [editKindState, setEditKindState] = React.useState<RoomDocType["kind"]>("deck");
  const [savingDoc, setSavingDoc] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<SerializedRoomDocument | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  /** Per-file concurrent queue state simplified: show first uploading file name optional */
  const [localBusy, setLocalBusy] = React.useState(false);

  const mergedUploading =
    props.uploading || localBusy || (props.uploadProgress != null && props.uploadProgress < 100 && props.uploadProgress > 0);

  async function onFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!props.selectedRoomId) {
      toast.error("Select a room first.");
      return;
    }
    if (arr.length === 0) return;
    void uploadSequential(arr);
  }

  async function uploadSequential(files: File[]) {
    setLocalBusy(true);
    let okCount = 0;
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("dataRoomId", props.selectedRoomId);
        fd.set("kind", kind);
        const res = await fetch("/api/data-room/documents", { method: "POST", body: fd });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        okCount += 1;
      }
      if (okCount === 1) toast.success("Document uploaded.");
      else toast.success(`${okCount} files uploaded.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setLocalBusy(false);
    }
  }

  function beginEdit(doc: SerializedRoomDocument) {
    setEditDocId(doc.id);
    setEditName(doc.name);
    setEditRoomId(doc.dataRoomId);
    setEditKindState(doc.kind);
    setEditOpen(true);
  }

  async function saveDocumentEdit() {
    const name = editName.trim();
    if (!editDocId || !name) {
      toast.error("Name is required.");
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
      const res = await fetch(`/api/data-room/documents/${deleteTarget.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete");
      toast.success("Document removed.");
      setDeleteTarget(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

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
      router.refresh();
    } catch (e) {
      popup?.close();
      toast.error(e instanceof Error ? e.message : "Could not open file");
    }
  }

  const activeDocs = props.documents.filter((d) => !props.selectedRoomId || d.dataRoomId === props.selectedRoomId);

  return (
    <div className="space-y-4">
      {props.uploadProgress != null && props.uploadProgress < 99 ? (
        <Progress value={props.uploadProgress} className="h-1 rounded-full" />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {props.canManage ? (
          <>
            <Badge variant="secondary" className="rounded-full">
              Bulk actions
            </Badge>
            <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl" disabled title="Coming soon">
              New folder
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl" disabled title="Coming soon">
              Generate share link
              <Layers className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,minmax(0,340px)]">
        <UploadZone
          disabled={!props.canManage || !props.selectedRoomId}
          uploading={mergedUploading}
          onFilesSelected={onFiles}
          inputRef={fileInputRef}
        />
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          {props.canManage ? (
            <>
              <Label className="text-xs uppercase text-muted-foreground">Default upload type</Label>
              <Select
                value={kind}
                onValueChange={(v) => {
                  if (typeof v === "string") setKind(v as RoomDocType["kind"]);
                }}
              >
                <SelectTrigger className="rounded-xl border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_ROOM_KIND_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl gap-2"
                disabled={mergedUploading || !props.selectedRoomId}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Browse files
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Applies to uploads from the drop zone above. Larger folders upload sequentially — watch for browser limits.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Browse opens from the Documents table below.</p>
          )}
        </div>
      </div>

      <ScrollArea className="h-[440px] max-h-[52vh] rounded-2xl border border-border shadow-sm [&>div>div]:!block [&>div>div]:!min-h-[min(440px,max-content)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-muted/60">
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Ver.</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="hidden xl:table-cell">Uploaded</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="hidden lg:table-cell">Last viewed</TableHead>
              <TableHead className="hidden 2xl:table-cell">Access</TableHead>
              <TableHead className="w-[56px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  {props.selectedRoomId ? "No documents in this room yet." : "Select a room to see documents."}
                </TableCell>
              </TableRow>
            ) : (
              activeDocs.map((d) => (
                <TableRow key={d.id} className="group hover:bg-muted/40">
                  <TableCell className="max-w-[200px] font-medium">
                    <span className="line-clamp-2">{d.name}</span>
                  </TableCell>
                  <TableCell>{kindLabel(d.kind)}</TableCell>
                  <TableCell className="tabular-nums">{d.version ?? 1}</TableCell>
                  <TableCell className="text-xs">{formatBytes(d.sizeBytes)}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                    {d.createdAt ? formatDistanceToNow(d.createdAt, { addSuffix: true }) : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">{d.viewCount ?? 0}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {d.lastViewedAt ? formatDistanceToNow(d.lastViewedAt, { addSuffix: true }) : "—"}
                  </TableCell>
                  <TableCell className="hidden capitalize 2xl:table-cell">{d.accessLevel ?? "invited"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          "inline-flex items-center justify-center rounded-lg border border-transparent hover:bg-muted hover:text-foreground h-8 w-8",
                        )}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-xl">
                        <DropdownMenuItem onClick={() => void openDocument(d.id)}>Preview</DropdownMenuItem>
                        {props.canManage ? (
                          <>
                            <DropdownMenuItem onClick={() => beginEdit(d)} className="gap-2">
                              <Pencil className="h-3.5 w-3.5" /> Rename / Move
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>Replace version</DropdownMenuItem>
                            <DropdownMenuItem disabled>Bulk unavailable</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void openDocument(d.id)} className="text-card-foreground">
                              Download via preview
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled className="text-muted-foreground">
                              Archive soon
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(d)}
                            >
                              <Trash2 className="mr-2 inline h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
            <DialogDescription>Update title, room, or category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dm-doc-name">Name</Label>
              <Input id="dm-doc-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Select
                value={editRoomId}
                onValueChange={(v) => setEditRoomId(typeof v === "string" ? v : "")}
              >
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Room" /></SelectTrigger>
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
                value={editKindState}
                onValueChange={(v) => {
                  if (typeof v === "string") setEditKindState(v as RoomDocType["kind"]);
                }}
              >
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATA_ROOM_KIND_OPTIONS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button className="rounded-xl" disabled={savingDoc} onClick={() => void saveDocumentEdit()}>
              {savingDoc ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `“${deleteTarget.name}” will be permanently removed.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0">
            <Button variant="outline" className="rounded-xl" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl" disabled={deleting} onClick={() => void confirmDeleteDocument()}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
