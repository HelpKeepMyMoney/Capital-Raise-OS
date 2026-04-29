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
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FolderPlus,
  Layers,
  MoreHorizontal,
  Pencil,
  Upload,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function formatBytes(n?: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

type DocFilter = "all" | "financials" | "legal" | "pitch" | "media" | "hidden";

function docMatches(d: SerializedRoomDocument, f: DocFilter): boolean {
  switch (f) {
    case "all":
      return true;
    case "financials":
      return d.kind === "model" || d.kind === "ppm";
    case "legal":
      return d.kind === "legal";
    case "pitch":
      return d.kind === "deck";
    case "media":
      return d.kind === "video" || d.kind === "other";
    case "hidden":
      return d.accessLevel === "internal";
    default:
      return true;
  }
}

function visibilityLabel(d: SerializedRoomDocument): string {
  if (d.accessLevel === "internal") return "Hidden";
  if (d.accessLevel === "vip") return "VIP";
  return "Investors";
}

type SortColumn =
  | "name"
  | "category"
  | "version"
  | "size"
  | "uploaded"
  | "views"
  | "lastViewed"
  | "visibility";

function SortableTableHead(props: {
  column: SortColumn;
  label: string;
  sortColumn: SortColumn;
  sortDir: "asc" | "desc";
  onSort: (c: SortColumn) => void;
  className?: string;
}) {
  const active = props.sortColumn === props.column;
  return (
    <TableHead className={props.className}>
      <button
        type="button"
        className={cn(
          "-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left font-semibold hover:bg-muted/80 hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
        onClick={() => props.onSort(props.column)}
      >
        <span>{props.label}</span>
        {active ? (
          props.sortDir === "asc" ? (
            <ArrowUp className="size-3.5 shrink-0 opacity-90" aria-hidden />
          ) : (
            <ArrowDown className="size-3.5 shrink-0 opacity-90" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="size-3.5 shrink-0 opacity-35" aria-hidden />
        )}
      </button>
    </TableHead>
  );
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
  const [uploadPct, setUploadPct] = React.useState<number | null>(null);
  const [docFilter, setDocFilter] = React.useState<DocFilter>("all");
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  function onSortColumn(col: SortColumn) {
    if (sortColumn === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortColumn(col);
      setSortDir("asc");
    }
  }

  const mergedUploading = props.uploading || localBusy;

  async function uploadWithProgress(file: File, onPct: (n: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/data-room/documents");
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else {
          try {
            const j = JSON.parse(xhr.responseText) as { error?: string };
            reject(new Error(j.error ?? xhr.statusText));
          } catch {
            reject(new Error(xhr.statusText || "Upload failed"));
          }
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onPct(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      };
      const fd = new FormData();
      fd.set("file", file);
      fd.set("dataRoomId", props.selectedRoomId);
      fd.set("kind", kind);
      xhr.send(fd);
    });
  }

  async function onFiles(files: FileList | File[]) {
    if (!props.canManage) return;
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
    setUploadPct(0);
    let okCount = 0;
    try {
      const n = files.length;
      for (let i = 0; i < n; i++) {
        const file = files[i]!;
        await uploadWithProgress(file, (p) => {
          const base = (i / n) * 100;
          const slice = (1 / n) * 100;
          setUploadPct(Math.round(base + (p / 100) * slice));
        });
        okCount += 1;
      }
      setUploadPct(100);
      if (okCount === 1) toast.success("Document uploaded.");
      else toast.success(`${okCount} files uploaded.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setLocalBusy(false);
      window.setTimeout(() => setUploadPct(null), 400);
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

  async function patchDocumentAccess(doc: SerializedRoomDocument, accessLevel: RoomDocType["accessLevel"]) {
    try {
      const res = await fetch(`/api/data-room/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessLevel }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update visibility");
      toast.success(accessLevel === "internal" ? "Hidden from investors" : "Visible to investors");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  const activeDocs = props.documents.filter((d) => !props.selectedRoomId || d.dataRoomId === props.selectedRoomId);

  const filteredByCategory = React.useMemo(
    () => activeDocs.filter((d) => docMatches(d, docFilter)),
    [activeDocs, docFilter],
  );

  const sortedDocs = React.useMemo(() => {
    const list = [...filteredByCategory];
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (a: SerializedRoomDocument, b: SerializedRoomDocument): number => {
      switch (sortColumn) {
        case "name":
          return dir * a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        case "category":
          return dir * kindLabel(a.kind).localeCompare(kindLabel(b.kind), undefined, { sensitivity: "base" });
        case "version":
          return dir * ((a.version ?? 1) - (b.version ?? 1));
        case "size":
          return dir * ((a.sizeBytes ?? 0) - (b.sizeBytes ?? 0));
        case "uploaded":
          return dir * ((a.createdAt ?? 0) - (b.createdAt ?? 0));
        case "views":
          return dir * ((a.viewCount ?? 0) - (b.viewCount ?? 0));
        case "lastViewed":
          return dir * ((a.lastViewedAt ?? 0) - (b.lastViewedAt ?? 0));
        case "visibility":
          return dir * visibilityLabel(a).localeCompare(visibilityLabel(b), undefined, {
            sensitivity: "base",
          });
        default:
          return 0;
      }
    };
    list.sort(cmp);
    return list;
  }, [filteredByCategory, sortColumn, sortDir]);

  return (
    <div className="space-y-4">
      {props.canManage && uploadPct != null && uploadPct < 100 ? (
        <Progress value={uploadPct} className="h-1 rounded-full" />
      ) : null}

      {props.canManage ? (
        <>
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
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr,minmax(0,340px)]">
            <UploadZone
              disabled={!props.selectedRoomId}
              uploading={mergedUploading}
              progress={uploadPct}
              onFilesSelected={onFiles}
              inputRef={fileInputRef}
            />
            <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
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
            </div>
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["financials", "Financials"],
            ["legal", "Legal"],
            ["pitch", "Pitch"],
            ["media", "Media"],
            ["hidden", "Hidden"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={docFilter === id ? "default" : "outline"}
            className="h-8 rounded-full text-xs"
            onClick={() => setDocFilter(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <ScrollArea className="h-[440px] max-h-[52vh] rounded-2xl border border-border shadow-sm [&>div>div]:!block [&>div>div]:!min-h-[min(440px,max-content)]">
        <Table zebra>
          <TableHeader>
            <TableRow className="hover:bg-muted/60">
              <SortableTableHead
                column="name"
                label="Name"
                sortColumn={sortColumn}
                sortDir={sortDir}
                onSort={onSortColumn}
              />
              <SortableTableHead
                column="category"
                label="Category"
                sortColumn={sortColumn}
                sortDir={sortDir}
                onSort={onSortColumn}
              />
              <SortableTableHead
                column="version"
                label="Ver."
                sortColumn={sortColumn}
                sortDir={sortDir}
                onSort={onSortColumn}
              />
              <SortableTableHead
                column="size"
                label="Size"
                sortColumn={sortColumn}
                sortDir={sortDir}
                onSort={onSortColumn}
              />
              <SortableTableHead
                column="uploaded"
                label="Uploaded"
                className="hidden xl:table-cell"
                sortColumn={sortColumn}
                sortDir={sortDir}
                onSort={onSortColumn}
              />
              <SortableTableHead
                column="views"
                label="Views"
                sortColumn={sortColumn}
                sortDir={sortDir}
                onSort={onSortColumn}
              />
              <SortableTableHead
                column="lastViewed"
                label="Last viewed"
                className="hidden lg:table-cell"
                sortColumn={sortColumn}
                sortDir={sortDir}
                onSort={onSortColumn}
              />
              <SortableTableHead
                column="visibility"
                label="Visibility"
                className="hidden 2xl:table-cell"
                sortColumn={sortColumn}
                sortDir={sortDir}
                onSort={onSortColumn}
              />
              <TableHead className="w-[56px]" aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  {props.selectedRoomId ? "No documents in this room yet." : "Select a room to see documents."}
                </TableCell>
              </TableRow>
            ) : filteredByCategory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  No documents match this filter.
                </TableCell>
              </TableRow>
            ) : (
              sortedDocs.map((d) => (
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
                  <TableCell className="hidden capitalize 2xl:table-cell">{visibilityLabel(d)}</TableCell>
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
                            <DropdownMenuItem
                              onClick={() => void patchDocumentAccess(d, d.accessLevel === "internal" ? "invited" : "internal")}
                            >
                              {d.accessLevel === "internal" ? "Visible to investors" : "Hide from investors"}
                            </DropdownMenuItem>
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
