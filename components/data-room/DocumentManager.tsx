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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { InvestorNdaRequestButton } from "@/components/data-room/investor-nda-request-button";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Layers,
  MoreHorizontal,
  Pencil,
  Upload,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";

function formatBytes(n?: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function normParentId(p: string | null | undefined): string | null {
  if (typeof p === "string" && p.trim()) return p.trim();
  return null;
}

/** Folder path selects — show full labels in the trigger and dropdown (default Select clamps to one line). */
const DATA_ROOM_FOLDER_SELECT_TRIGGER_CLASS =
  "h-auto min-h-9 w-full min-w-0 items-start justify-between gap-2 whitespace-normal py-2.5 text-left [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal [&_[data-slot=select-value]]:break-words [&_[data-slot=select-value]]:text-left";

const DATA_ROOM_FOLDER_SELECT_CONTENT_CLASS =
  "max-h-72 w-max min-w-72 max-w-[min(40rem,calc(100vw-2rem))]";

function docSearchMatches(d: SerializedRoomDocument, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return (
    d.name.toLowerCase().includes(s) ||
    d.kind.toLowerCase().includes(s) ||
    (d.mimeType?.toLowerCase().includes(s) ?? false)
  );
}

type DocFilter = "all" | "financials" | "legal" | "pitch" | "media" | "hidden";

function docMatches(d: SerializedRoomDocument, f: DocFilter): boolean {
  if (d.kind === "folder") return f === "all";
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
  /** Search text from room workspace (filters rows in the current folder). */
  documentSearch?: string;
  selectedRoomId: string;
  canManage: boolean;
  /** Investor cannot open previews until mutual NDA is completed (matched by session email). */
  investorDocsLockedByNda?: boolean;
  /** Present when an incomplete room NDA envelope has an active investor signing URL for this session. */
  investorPendingNdaSigningUrl?: string;
  investorNdaAwaitingSponsor?: boolean;
  investorNdaCanRequestSponsor?: boolean;
  uploading: boolean;
  uploadProgress?: number | null;
  /** Room list for move-to-room */
  rooms: { id: string; name: string }[];
};

export function DocumentManager(props: Props) {
  const router = useRouter();
  const mounted = useMounted();
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
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
  const [uploadFolderId, setUploadFolderId] = React.useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [newFolderParentId, setNewFolderParentId] = React.useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [editIsFolder, setEditIsFolder] = React.useState(false);
  const [editParentFolderId, setEditParentFolderId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCurrentFolderId(null);
  }, [props.selectedRoomId]);

  React.useEffect(() => {
    setUploadFolderId(currentFolderId);
  }, [currentFolderId]);

  function onSortColumn(col: SortColumn) {
    if (sortColumn === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortColumn(col);
      setSortDir("asc");
    }
  }

  const mergedUploading = props.uploading || localBusy;

  async function uploadWithProgress(file: File, onPct: (n: number) => void): Promise<void> {
    onPct(1);
    const prepBody = {
      dataRoomId: props.selectedRoomId,
      kind,
      parentFolderId: uploadFolderId ?? undefined,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    };
    const prep = await fetch("/api/data-room/documents/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prepBody),
    });
    if (!prep.ok) {
      const j = (await prep.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? (prep.statusText || "Upload failed"));
    }
    const { docId, uploadUrl, contentType } = (await prep.json()) as {
      docId: string;
      uploadUrl: string;
      contentType: string;
    };

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else {
          try {
            const j = JSON.parse(xhr.responseText) as { error?: string };
            reject(new Error(j.error ?? `Storage upload failed (${xhr.status})`));
          } catch {
            reject(new Error(`Storage upload failed (${xhr.status})`));
          }
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const slice = Math.min(98, Math.round((e.loaded / e.total) * 98));
          onPct(1 + slice);
        }
      };
      xhr.send(file);
    });

    onPct(99);
    const fin = await fetch("/api/data-room/documents/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docId,
        dataRoomId: props.selectedRoomId,
        kind,
        parentFolderId: uploadFolderId ?? null,
        fileName: file.name,
      }),
    });
    if (!fin.ok) {
      const j = (await fin.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? (fin.statusText || "Finalize failed"));
    }
    onPct(100);
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
    setEditKindState(doc.kind === "folder" ? "deck" : doc.kind);
    setEditIsFolder(doc.kind === "folder");
    setEditParentFolderId(normParentId(doc.parentFolderId));
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
      const body: Record<string, unknown> = {
        name,
        dataRoomId: editRoomId,
        parentFolderId: editParentFolderId,
      };
      if (!editIsFolder) body.kind = editKindState;
      const res = await fetch(`/api/data-room/documents/${editDocId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      toast.success(editIsFolder ? "Folder updated" : "Document updated");
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
      toast.success(deleteTarget.kind === "folder" ? "Folder removed." : "Document removed.");
      setDeleteTarget(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

  function openNewFolderDialog(parent: string | null) {
    setNewFolderName("");
    setNewFolderParentId(parent);
    setNewFolderOpen(true);
  }

  async function createFolderSubmit() {
    const name = newFolderName.trim();
    if (!name) {
      toast.error("Folder name is required.");
      return;
    }
    if (!props.selectedRoomId) {
      toast.error("Select a room first.");
      return;
    }
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/data-room/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataRoomId: props.selectedRoomId,
          name,
          parentFolderId: newFolderParentId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create folder");
      toast.success("Folder created.");
      setNewFolderOpen(false);
      setNewFolderName("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create folder");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function moveDocumentToFolder(doc: SerializedRoomDocument, targetFolderId: string | null) {
    try {
      const res = await fetch(`/api/data-room/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentFolderId: targetFolderId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not move");
      toast.success(targetFolderId ? "Moved into folder." : "Moved to room root.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not move");
    }
  }

  async function openDocument(doc: SerializedRoomDocument) {
    // Do not pass "noopener" in the window features string: with noopener, many
    // browsers return null from window.open(), and we need this handle to set
    // location after the async sign-url fetch (otherwise the app falls back to
    // navigating the current tab).
    const popup = window.open("about:blank", "_blank");
    try {
      const res = await fetch("/api/data-room/sign-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not open file");
      if (popup && !popup.closed) {
        popup.opener = null;
        popup.location.href = data.url;
      } else {
        const direct = window.open(data.url, "_blank", "noopener,noreferrer");
        if (!direct) {
          toast.error("Pop-up blocked. Allow pop-ups for this site, then try Preview again.");
          return;
        }
      }
      router.refresh();
    } catch (e) {
      popup?.close();
      toast.error(e instanceof Error ? e.message : "Could not open file");
    }
  }

  async function patchDocumentAccess(doc: SerializedRoomDocument, accessLevel: RoomDocType["accessLevel"]) {
    if (doc.kind === "folder") return;
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

  const searchQ = props.documentSearch ?? "";

  const activeDocs = props.documents.filter((d) => !props.selectedRoomId || d.dataRoomId === props.selectedRoomId);

  const filteredByCategory = React.useMemo(
    () => activeDocs.filter((d) => docMatches(d, docFilter)),
    [activeDocs, docFilter],
  );

  const atFolderLevel = React.useMemo(
    () => filteredByCategory.filter((d) => normParentId(d.parentFolderId) === normParentId(currentFolderId)),
    [filteredByCategory, currentFolderId],
  );

  const searchedDocs = React.useMemo(
    () => atFolderLevel.filter((d) => docSearchMatches(d, searchQ)),
    [atFolderLevel, searchQ],
  );

  const breadcrumbSegments = React.useMemo(() => {
    if (!currentFolderId) return [] as { id: string; name: string }[];
    const folders = activeDocs.filter((d) => d.kind === "folder");
    const byId = new Map(folders.map((f) => [f.id, f]));
    const chain: { id: string; name: string }[] = [];
    let id: string | null = currentFolderId;
    while (id) {
      const f = byId.get(id);
      if (!f) break;
      chain.unshift({ id: f.id, name: f.name });
      id = normParentId(f.parentFolderId);
    }
    return chain;
  }, [activeDocs, currentFolderId]);

  const roomFolders = React.useMemo(() => activeDocs.filter((d) => d.kind === "folder"), [activeDocs]);

  const allFolderOptions = React.useMemo(() => {
    return roomFolders
      .map((f) => {
        const parts: string[] = [];
        let cur: string | null = normParentId(f.parentFolderId);
        const seen = new Set<string>();
        while (cur) {
          if (seen.has(cur)) break;
          seen.add(cur);
          const parent = roomFolders.find((x) => x.id === cur);
          if (!parent) break;
          parts.unshift(parent.name);
          cur = normParentId(parent.parentFolderId);
        }
        const path = parts.length ? `${parts.join(" / ")} / ` : "";
        return { id: f.id, label: `${path}${f.name}` };
      })
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [roomFolders]);

  function descendantSet(rootId: string): Set<string> {
    const out = new Set<string>([rootId]);
    let added = true;
    while (added) {
      added = false;
      for (const f of roomFolders) {
        if (out.has(f.id)) continue;
        const p = normParentId(f.parentFolderId);
        if (p && out.has(p)) {
          out.add(f.id);
          added = true;
        }
      }
    }
    return out;
  }

  const folderSelectOptions = React.useMemo(() => {
    const banned = editDocId && editIsFolder ? descendantSet(editDocId) : new Set<string>();
    return allFolderOptions.filter((o) => !banned.has(o.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFolderOptions, editDocId, editIsFolder, roomFolders]);

  const sortedDocs = React.useMemo(() => {
    const list = [...searchedDocs];
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
    list.sort((a, b) => {
      const fa = a.kind === "folder" ? 0 : 1;
      const fb = b.kind === "folder" ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return cmp(a, b);
    });
    return list;
  }, [searchedDocs, sortColumn, sortDir]);

  return (
    <div className="space-y-4">
      {props.canManage && uploadPct != null && uploadPct < 100 ? (
        <Progress value={uploadPct} className="h-1 rounded-full" />
      ) : null}

      {!props.canManage && props.investorDocsLockedByNda ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-6 text-sm text-amber-950 dark:border-amber-400/35 dark:bg-amber-950/40 dark:text-amber-50"
        >
          <p className="font-semibold">Mutual NDA required</p>
          <p className="mt-2 text-amber-950/90 dark:text-amber-50/95">
            You can&apos;t preview or download files in this room until the mutual NDA for your email address is
            completed.
          </p>
          {typeof props.investorPendingNdaSigningUrl === "string" && props.investorPendingNdaSigningUrl.length > 0 ? (
            <div className="mt-4">
              <Button asChild className="rounded-lg">
                <a href={props.investorPendingNdaSigningUrl} target="_blank" rel="noopener noreferrer">
                  Open NDA signing
                </a>
              </Button>
            </div>
          ) : props.investorNdaAwaitingSponsor ? (
            <p className="mt-4 text-amber-950/95 dark:text-amber-50/95">
              The sponsor is signing first. You&apos;ll receive a link by email when it&apos;s your turn.
            </p>
          ) : props.investorNdaCanRequestSponsor ? (
            <div className="mt-4 flex flex-col gap-3">
              <InvestorNdaRequestButton roomId={props.selectedRoomId} className="w-fit rounded-lg" />
              <p className="text-xs text-amber-950/90 dark:text-amber-50/95">
                Emails leadership in this workspace when delivery is configured.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-amber-950/90 dark:text-amber-50/95">
              Contact the sponsor if you haven&apos;t received a signing link, or confirm your CapitalOS email matches
              the address they used when they set up your NDA.
            </p>
          )}
        </div>
      ) : null}

      {!props.canManage && props.investorDocsLockedByNda ? null : (
        <>
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl"
              disabled={!props.selectedRoomId}
              onClick={() => openNewFolderDialog(currentFolderId)}
            >
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
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Upload into folder</Label>
                <Select
                  value={uploadFolderId ?? "__root__"}
                  onValueChange={(v) => setUploadFolderId(v === "__root__" ? null : v)}
                  disabled={!props.selectedRoomId}
                >
                  <SelectTrigger
                    className={cn(DATA_ROOM_FOLDER_SELECT_TRIGGER_CLASS, "rounded-xl border-border")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} className={DATA_ROOM_FOLDER_SELECT_CONTENT_CLASS}>
                    <SelectItem value="__root__">Room root</SelectItem>
                    {allFolderOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>
                    {uploadFolderId
                      ? "New files land in the chosen folder."
                      : "New files land at the room root."}
                  </span>
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() => openNewFolderDialog(uploadFolderId)}
                    disabled={!props.selectedRoomId}
                  >
                    New folder
                  </button>
                </div>
              </div>

              <div className="space-y-2">
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
              </div>

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
                Larger batches upload sequentially — watch for browser limits.
              </p>
            </div>
          </div>
        </>
      ) : null}

      {props.selectedRoomId ? (
        <nav className="flex flex-wrap items-center gap-0.5 text-sm text-muted-foreground" aria-label="Folder location">
          <button
            type="button"
            className={cn(
              "rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground",
              !currentFolderId && "font-semibold text-foreground",
            )}
            onClick={() => setCurrentFolderId(null)}
          >
            All files
          </button>
          {breadcrumbSegments.map((seg, i) => {
            const isLast = i === breadcrumbSegments.length - 1;
            return (
              <React.Fragment key={seg.id}>
                <ChevronRight className="mx-0.5 inline h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                {isLast ? (
                  <span className="rounded-md px-1.5 py-0.5 font-semibold text-foreground">{seg.name}</span>
                ) : (
                  <button
                    type="button"
                    className="rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
                    onClick={() => setCurrentFolderId(seg.id)}
                  >
                    {seg.name}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>
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
            {!props.selectedRoomId ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  Select a room to see documents.
                </TableCell>
              </TableRow>
            ) : activeDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  No documents in this room yet.
                </TableCell>
              </TableRow>
            ) : filteredByCategory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  No documents match this filter.
                </TableCell>
              </TableRow>
            ) : atFolderLevel.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  This folder is empty.
                </TableCell>
              </TableRow>
            ) : searchedDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  Nothing matches this search in this folder.
                </TableCell>
              </TableRow>
            ) : (
              sortedDocs.map((d) => (
                <TableRow key={d.id} className="group hover:bg-muted/40">
                  <TableCell className="max-w-[220px] font-medium">
                    {d.kind === "folder" ? (
                      <button
                        type="button"
                        className="line-clamp-2 inline-flex w-full min-w-0 items-center gap-1.5 text-left text-primary hover:underline"
                        onClick={() => setCurrentFolderId(d.id)}
                      >
                        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0">{d.name}</span>
                      </button>
                    ) : (
                      <span className="line-clamp-2">{d.name}</span>
                    )}
                  </TableCell>
                  <TableCell>{kindLabel(d.kind)}</TableCell>
                  <TableCell className="tabular-nums">{d.kind === "folder" ? "—" : d.version ?? 1}</TableCell>
                  <TableCell className="text-xs">{d.kind === "folder" ? "—" : formatBytes(d.sizeBytes)}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                    {d.createdAt ? (mounted ? formatDistanceToNow(d.createdAt, { addSuffix: true }) : "—") : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">{d.kind === "folder" ? "—" : d.viewCount ?? 0}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {d.kind === "folder"
                      ? "—"
                      : d.lastViewedAt
                        ? mounted
                          ? formatDistanceToNow(d.lastViewedAt, { addSuffix: true })
                          : "—"
                        : "—"}
                  </TableCell>
                  <TableCell className="hidden capitalize 2xl:table-cell">
                    {d.kind === "folder" ? "—" : visibilityLabel(d)}
                  </TableCell>
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
                      <DropdownMenuContent align="end" className="w-56 rounded-xl">
                        {d.kind === "folder" ? (
                          <DropdownMenuItem onClick={() => setCurrentFolderId(d.id)}>Open folder</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => void openDocument(d)}>Preview</DropdownMenuItem>
                        )}
                        {props.canManage ? (
                          <>
                            <DropdownMenuItem onClick={() => beginEdit(d)} className="gap-2">
                              <Pencil className="h-3.5 w-3.5" /> Rename / Move
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="gap-2">
                                <Folder className="h-3.5 w-3.5" /> Move to…
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="max-h-72 min-w-64 max-w-[min(40rem,calc(100vw-2rem))] w-max overflow-y-auto rounded-xl">
                                <DropdownMenuItem
                                  disabled={!normParentId(d.parentFolderId)}
                                  onClick={() => void moveDocumentToFolder(d, null)}
                                >
                                  Room root
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {(() => {
                                  const banned = d.kind === "folder" ? descendantSet(d.id) : new Set<string>();
                                  const opts = allFolderOptions.filter((o) => !banned.has(o.id));
                                  if (opts.length === 0) {
                                    return (
                                      <DropdownMenuItem disabled className="text-muted-foreground">
                                        No other folders
                                      </DropdownMenuItem>
                                    );
                                  }
                                  return opts.map((o) => (
                                    <DropdownMenuItem
                                      key={o.id}
                                      className="max-w-[min(40rem,calc(100vw-2rem))] whitespace-normal break-words"
                                      disabled={normParentId(d.parentFolderId) === o.id}
                                      onClick={() => void moveDocumentToFolder(d, o.id)}
                                    >
                                      {o.label}
                                    </DropdownMenuItem>
                                  ));
                                })()}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            {d.kind === "folder" ? null : (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    void patchDocumentAccess(d, d.accessLevel === "internal" ? "invited" : "internal")
                                  }
                                >
                                  {d.accessLevel === "internal" ? "Visible to investors" : "Hide from investors"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void openDocument(d)} className="text-card-foreground">
                                  Download via preview
                                </DropdownMenuItem>
                              </>
                            )}
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
        </>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editIsFolder ? "Edit folder" : "Edit document"}</DialogTitle>
            <DialogDescription>
              {editIsFolder ? "Update the folder name or where it sits in the tree." : "Update title, room, category, or folder."}
            </DialogDescription>
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
                disabled={editIsFolder}
                onValueChange={(v) => setEditRoomId(typeof v === "string" ? v : "")}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Room" />
                </SelectTrigger>
                <SelectContent>
                  {props.rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editIsFolder ? (
                <p className="text-[11px] text-muted-foreground">
                  Move files out of this folder before you can assign the folder to another room.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Inside folder</Label>
              <Select
                value={editParentFolderId ?? "__root__"}
                onValueChange={(v) => setEditParentFolderId(v === "__root__" ? null : v)}
              >
                <SelectTrigger className={cn(DATA_ROOM_FOLDER_SELECT_TRIGGER_CLASS, "rounded-xl")}>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className={DATA_ROOM_FOLDER_SELECT_CONTENT_CLASS}>
                  <SelectItem value="__root__">Room root</SelectItem>
                  {folderSelectOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editIsFolder ? null : (
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editKindState}
                  onValueChange={(v) => {
                    if (typeof v === "string") setEditKindState(v as RoomDocType["kind"]);
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_ROOM_KIND_OPTIONS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Folders organize documents inside a room. Pick a parent (or leave at room root) and a name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dm-new-folder">Folder name</Label>
              <Input
                id="dm-new-folder"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="rounded-xl"
                placeholder="e.g. Financials"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createFolderSubmit();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Parent folder</Label>
              <Select
                value={newFolderParentId ?? "__root__"}
                onValueChange={(v) => setNewFolderParentId(v === "__root__" ? null : v)}
              >
                <SelectTrigger className={cn(DATA_ROOM_FOLDER_SELECT_TRIGGER_CLASS, "rounded-xl")}>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className={DATA_ROOM_FOLDER_SELECT_CONTENT_CLASS}>
                  <SelectItem value="__root__">Room root</SelectItem>
                  {allFolderOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent gap-2 sm:justify-end">
            <Button variant="outline" className="rounded-xl" disabled={creatingFolder} onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" disabled={creatingFolder} onClick={() => void createFolderSubmit()}>
              {creatingFolder ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{deleteTarget?.kind === "folder" ? "Delete folder?" : "Delete document?"}</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? deleteTarget.kind === "folder"
                  ? `“${deleteTarget.name}” will be removed. Files inside stay in the room and move up one level.`
                  : `“${deleteTarget.name}” will be permanently removed.`
                : ""}
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
