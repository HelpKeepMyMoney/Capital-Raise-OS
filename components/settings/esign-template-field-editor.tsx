"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EsignFieldAssignee, EsignFieldType, EsignTemplateField } from "@/lib/firestore/types";
import { ESIGN_PDF_VIEW_SCALE } from "@/components/esign/sign-pdf-layer";

type PdfjsModule = typeof import("pdfjs-dist");

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const RESIZE_MIN_PX = 8;
const HANDLE_PX = 10;

function applyResizeDelta(
  handle: ResizeHandle,
  start: { l: number; t: number; w: number; h: number },
  dPx: number,
  dPy: number,
  maxW: number,
  maxH: number,
): { l: number; t: number; w: number; h: number } {
  let l = start.l;
  let t = start.t;
  let w = start.w;
  let h = start.h;
  switch (handle) {
    case "se":
      w = start.w + dPx;
      h = start.h + dPy;
      break;
    case "e":
      w = start.w + dPx;
      break;
    case "s":
      h = start.h + dPy;
      break;
    case "nw":
      l = start.l + dPx;
      t = start.t + dPy;
      w = start.w - dPx;
      h = start.h - dPy;
      break;
    case "n":
      t = start.t + dPy;
      h = start.h - dPy;
      break;
    case "ne":
      t = start.t + dPy;
      w = start.w + dPx;
      h = start.h - dPy;
      break;
    case "sw":
      l = start.l + dPx;
      w = start.w - dPx;
      h = start.h + dPy;
      break;
    case "w":
      l = start.l + dPx;
      w = start.w - dPx;
      break;
  }
  w = Math.max(RESIZE_MIN_PX, w);
  h = Math.max(RESIZE_MIN_PX, h);
  l = Math.max(0, Math.min(l, maxW - RESIZE_MIN_PX));
  t = Math.max(0, Math.min(t, maxH - RESIZE_MIN_PX));
  if (l + w > maxW) w = Math.max(RESIZE_MIN_PX, maxW - l);
  if (t + h > maxH) h = Math.max(RESIZE_MIN_PX, maxH - t);
  w = Math.max(RESIZE_MIN_PX, w);
  h = Math.max(RESIZE_MIN_PX, h);
  return { l, t, w, h };
}

function cursorForHandle(h: ResizeHandle): string {
  const m: Record<ResizeHandle, string> = {
    nw: "nwse-resize",
    n: "ns-resize",
    ne: "nesw-resize",
    e: "ew-resize",
    se: "nwse-resize",
    s: "ns-resize",
    sw: "nesw-resize",
    w: "ew-resize",
  };
  return m[h];
}

const HANDLE_STYLES: Record<ResizeHandle, React.CSSProperties> = {
  nw: { left: 0, top: 0, transform: "translate(-50%, -50%)" },
  n: { left: "50%", top: 0, transform: "translate(-50%, -50%)" },
  ne: { left: "100%", top: 0, transform: "translate(-50%, -50%)" },
  e: { left: "100%", top: "50%", transform: "translate(-50%, -50%)" },
  se: { left: "100%", top: "100%", transform: "translate(-50%, -50%)" },
  s: { left: "50%", top: "100%", transform: "translate(-50%, -50%)" },
  sw: { left: 0, top: "100%", transform: "translate(-50%, -50%)" },
  w: { left: 0, top: "50%", transform: "translate(-50%, -50%)" },
};

const ALL_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** Box + handle colors on the PDF overlay */
function assigneeFieldChrome(assignee: EsignFieldAssignee): { body: string; handle: string } {
  if (assignee === "sponsor") {
    return {
      body: "border-violet-600/85 bg-violet-500/12 dark:border-violet-400/90 dark:bg-violet-500/15",
      handle:
        "border-violet-600 dark:border-violet-400 hover:bg-violet-500/15 dark:hover:bg-violet-500/20",
    };
  }
  return {
    body: "border-sky-600/85 bg-sky-500/12 dark:border-sky-400/90 dark:bg-sky-500/15",
    handle: "border-sky-600 dark:border-sky-400 hover:bg-sky-500/15 dark:hover:bg-sky-500/20",
  };
}

export function EsignTemplateFieldEditor(props: {
  templateId: string;
  templateName: string;
  onFieldsSaved: (fields: EsignTemplateField[]) => void;
  onRenamed: (name: string) => void;
}) {
  const [name, setName] = React.useState(props.templateName);
  const [fields, setFields] = React.useState<EsignTemplateField[]>([]);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageCount, setPageCount] = React.useState(0);
  const [pdfReady, setPdfReady] = React.useState(false);
  const [hasSourcePdf, setHasSourcePdf] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(null);
  const [viewport, setViewport] = React.useState<{ w: number; h: number } | null>(null);
  const [pdfEpoch, setPdfEpoch] = React.useState(0);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const pdfRef = React.useRef<Awaited<ReturnType<PdfjsModule["getDocument"]>["promise"]> | null>(null);
  const dragRef = React.useRef<{ active: boolean; x0: number; y0: number; x1: number; y1: number } | null>(null);
  const drawTokenRef = React.useRef(0);
  const [dragPreview, setDragPreview] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const fieldsRef = React.useRef(fields);
  const pageIndexRef = React.useRef(pageIndex);
  React.useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);
  React.useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);

  const beginResize = React.useCallback((e: React.PointerEvent, fieldId: string, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ob = overlay.getBoundingClientRect();
    const f = fieldsRef.current.find((x) => x.id === fieldId && x.pageIndex === pageIndexRef.current);
    if (!f) return;
    const maxW = ob.width;
    const maxH = ob.height;
    const startRectPx = {
      l: f.rectNorm.x * maxW,
      t: f.rectNorm.y * maxH,
      w: Math.max(RESIZE_MIN_PX, f.rectNorm.w * maxW),
      h: Math.max(RESIZE_MIN_PX, f.rectNorm.h * maxH),
    };
    const startPointer = { x: e.clientX - ob.left, y: e.clientY - ob.top };

    const onMove = (ev: PointerEvent) => {
      const cx = ev.clientX - ob.left;
      const cy = ev.clientY - ob.top;
      const dPx = cx - startPointer.x;
      const dPy = cy - startPointer.y;
      const next = applyResizeDelta(handle, startRectPx, dPx, dPy, maxW, maxH);
      const xn = clamp01(next.l / maxW);
      const yn = clamp01(next.t / maxH);
      const wn = Math.max(0.001, Math.min(1 - xn, next.w / maxW));
      const hn = Math.max(0.001, Math.min(1 - yn, next.h / maxH));
      const rectNorm = { x: xn, y: yn, w: wn, h: hn };
      setFields((prev) => prev.map((ff) => (ff.id === fieldId ? { ...ff, rectNorm } : ff)));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  const beginMove = React.useCallback((e: React.PointerEvent, fieldId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ob = overlay.getBoundingClientRect();
    const f = fieldsRef.current.find((x) => x.id === fieldId && x.pageIndex === pageIndexRef.current);
    if (!f) return;
    const maxW = ob.width;
    const maxH = ob.height;
    const wPx = Math.max(RESIZE_MIN_PX, f.rectNorm.w * maxW);
    const hPx = Math.max(RESIZE_MIN_PX, f.rectNorm.h * maxH);
    const startLPx = f.rectNorm.x * maxW;
    const startTPx = f.rectNorm.y * maxH;
    const startPointer = { x: e.clientX - ob.left, y: e.clientY - ob.top };
    const wNorm = f.rectNorm.w;
    const hNorm = f.rectNorm.h;

    const onMove = (ev: PointerEvent) => {
      const cx = ev.clientX - ob.left;
      const cy = ev.clientY - ob.top;
      const dPx = cx - startPointer.x;
      const dPy = cy - startPointer.y;
      let l = startLPx + dPx;
      let t = startTPx + dPy;
      l = Math.max(0, Math.min(l, maxW - wPx));
      t = Math.max(0, Math.min(t, maxH - hPx));
      const xn = clamp01(l / maxW);
      const yn = clamp01(t / maxH);
      const rectNorm = { x: xn, y: yn, w: wNorm, h: hNorm };
      setFields((prev) => prev.map((ff) => (ff.id === fieldId ? { ...ff, rectNorm } : ff)));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  const loadDetail = React.useCallback(async () => {
    setLoading(true);
    setHasSourcePdf(false);
    setPageCount(0);
    setPdfReady(false);
    pdfRef.current = null;
    try {
      const res = await fetch(`/api/esign/templates/${props.templateId}`);
      const json = (await res.json()) as {
        name?: string;
        esignFields?: EsignTemplateField[];
        hasSourcePdf?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not load template");
      setName(json.name ?? props.templateName);
      setFields(Array.isArray(json.esignFields) ? json.esignFields : []);
      setHasSourcePdf(Boolean(json.hasSourcePdf));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
      setHasSourcePdf(false);
    } finally {
      setLoading(false);
    }
  }, [props.templateId, props.templateName]);

  React.useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const renderPage = React.useCallback(async (pdfjs: PdfjsModule, pageIdx: number) => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    const token = ++drawTokenRef.current;
    const page = await pdf.getPage(pageIdx + 1);
    if (token !== drawTokenRef.current) return;

    const vp = page.getViewport({ scale: ESIGN_PDF_VIEW_SCALE });
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = vp.width;
    canvas.height = vp.height;
    setViewport({ w: vp.width, h: vp.height });

    if (overlayRef.current) {
      overlayRef.current.style.width = `${vp.width}px`;
      overlayRef.current.style.height = `${vp.height}px`;
    }

    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    if (token !== drawTokenRef.current) return;
    setPdfReady(true);
  }, []);

  const loadPdfDocument = React.useCallback(async () => {
    setPdfReady(false);
    setViewport(null);
    pdfRef.current = null;

    const res = await fetch(`/api/esign/templates/${props.templateId}/file`);
    if (!res.ok) {
      if (res.status === 404) {
        setHasSourcePdf(false);
        setPageCount(0);
        toast.error("PDF not found in storage. Try uploading again.");
        return;
      }
      toast.error("Could not load PDF");
      return;
    }
    const buf = await res.arrayBuffer();
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`;

    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    pdfRef.current = pdf;
    setPageCount(pdf.numPages);
    setPageIndex(0);
    setPdfEpoch((e) => e + 1);
  }, [props.templateId]);

  React.useEffect(() => {
    if (!hasSourcePdf) {
      setPdfReady(false);
      setViewport(null);
      pdfRef.current = null;
      setPageCount(0);
      return;
    }
    void loadPdfDocument();
  }, [hasSourcePdf, props.templateId, loadPdfDocument]);

  React.useEffect(() => {
    if (!hasSourcePdf || pageCount <= 0) return;
    const pdf = pdfRef.current;
    if (!pdf) return;
    let cancelled = false;
    void (async () => {
      const pdfjs = await import("pdfjs-dist");
      if (cancelled) return;
      await renderPage(pdfjs, pageIndex);
    })();
    return () => {
      cancelled = true;
    };
  }, [pageIndex, pageCount, hasSourcePdf, pdfEpoch, renderPage]);

  async function uploadPdf(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/esign/templates/${props.templateId}`, { method: "POST", body: fd });
      let message = "Upload failed";
      if (res.ok) {
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (json.ok) {
          toast.success("PDF uploaded");
          setHasSourcePdf(true);
          return;
        }
        message = json.error ?? message;
      } else {
        try {
          const j = (await res.json()) as { error?: string };
          message = j.error ?? `${message} (${res.status})`;
        } catch {
          const t = await res.text();
          message = t ? t.slice(0, 180) : `${message} (${res.status})`;
        }
      }
      throw new Error(message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const nameTrim = name.trim();
      if (!nameTrim) throw new Error("Name required");
      const res = await fetch(`/api/esign/templates/${props.templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameTrim, esignFields: fields }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      props.onRenamed(nameTrim);
      props.onFieldsSaved(fields);
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function normRect(
    left: number,
    top: number,
    right: number,
    bottom: number,
    w: number,
    h: number,
  ): EsignTemplateField["rectNorm"] {
    const x0 = clamp01(Math.min(left, right) / w);
    const y0 = clamp01(Math.min(top, bottom) / h);
    const x1 = clamp01(Math.max(left, right) / w);
    const y1 = clamp01(Math.max(top, bottom) / h);
    const rw = Math.max(0.001, x1 - x0);
    const rh = Math.max(0.001, y1 - y0);
    return { x: x0, y: y0, w: rw, h: rh };
  }

  function onOverlayPointerDown(e: React.PointerEvent) {
    if (!overlayRef.current || !pdfReady) return;
    const r = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    dragRef.current = { active: true, x0: x, y0: y, x1: x, y1: y };
    setDragPreview({ x, y, w: 0, h: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onOverlayPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d?.active || !overlayRef.current) return;
    const r = overlayRef.current.getBoundingClientRect();
    d.x1 = e.clientX - r.left;
    d.y1 = e.clientY - r.top;
    const left = Math.min(d.x0, d.x1);
    const top = Math.min(d.y0, d.y1);
    const pw = Math.abs(d.x1 - d.x0);
    const ph = Math.abs(d.y1 - d.y0);
    setDragPreview({ x: left, y: top, w: pw, h: ph });
  }

  function onOverlayPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    dragRef.current = null;
    setDragPreview(null);
    if (!d?.active || !overlayRef.current) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const r = overlayRef.current.getBoundingClientRect();
    const w = r.width;
    const h = r.height;
    if (w < 8 || h < 8) return;
    const rect = normRect(d.x0, d.y0, d.x1, d.y1, w, h);
    if (rect.w < 0.002 || rect.h < 0.002) return;
    const id = crypto.randomUUID().slice(0, 12);
    const next: EsignTemplateField = {
      id,
      label: `Field ${fields.length + 1}`,
      fieldType: "text",
      pageIndex,
      rectNorm: rect,
      assignee: "investor",
      required: true,
    };
    setFields((prev) => [...prev, next]);
    setSelectedFieldId(id);
  }

  const fieldsThisPage = fields.filter((f) => f.pageIndex === pageIndex);
  const selected = fields.find((f) => f.id === selectedFieldId) ?? null;

  const W = viewport?.w ?? 1;
  const H = viewport?.h ?? 1;

  function updateSelected(patch: Partial<EsignTemplateField>) {
    if (!selectedFieldId) return;
    setFields((prev) => prev.map((f) => (f.id === selectedFieldId ? { ...f, ...patch } : f)));
  }

  function deleteSelected() {
    if (!selectedFieldId) return;
    setFields((prev) => prev.filter((f) => f.id !== selectedFieldId));
    setSelectedFieldId(null);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading template…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`tpl-rename-${props.templateId}`}>Template name</Label>
          <Input
            id={`tpl-rename-${props.templateId}`}
            className="rounded-xl"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="button" variant="secondary" className="rounded-xl" disabled={saving} onClick={() => void saveAll()}>
            {saving ? "Saving…" : "Save name & fields"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>PDF file</Label>
        <Input
          type="file"
          accept="application/pdf"
          className="cursor-pointer rounded-xl"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void uploadPdf(f);
          }}
        />
        {hasSourcePdf ? null : (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Upload a PDF to place fields. If upload fails, check the toast message — Firebase Storage must be enabled and
            your server credentials need permission to write the bucket.
          </p>
        )}
      </div>

      <details className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">Merge field IDs (auto-fill)</summary>
        <p className="mt-2 mb-1">
          Use these exact <strong className="text-foreground">Field id</strong> values on text or date fields. Signature
          placement boxes ignore merge data.
        </p>
        <ul className="list-disc pl-4 space-y-1 font-mono text-[11px]">
          <li className="list-none font-sans text-muted-foreground mb-1">Sponsor assignee — organization (Settings → Organization contact):</li>
          <li>org.legalName, org.street1, org.street2, org.city, org.region, org.postalCode, org.country, org.phone</li>
          <li>org.contact.name, org.contact.title, org.contact.email, org.contact.phone</li>
          <li className="list-none font-sans text-muted-foreground mt-2 mb-1">Sponsor assignee — signing user profile:</li>
          <li>
            user.displayName, user.email, user.phone, user.title, user.street1, user.street2, user.city, user.region,
            user.postalCode, user.country
          </li>
          <li className="list-none font-sans text-muted-foreground mt-2 mb-1">Investor / LP assignee:</li>
          <li>investor.name, investor.email</li>
        </ul>
      </details>

      {hasSourcePdf && pageCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg"
            disabled={pageIndex <= 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pageIndex + 1} / {pageCount}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Drag on empty PDF to add a box. Drag a box to move it; handles resize.
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-muted/30 p-2">
          <div className="relative inline-block">
            {/*
              Do not use max-w-full on the canvas: it scales the bitmap without changing the overlay
              size, so rectNorm coords are saved against the wrong aspect/scale and signing misaligns.
            */}
            <canvas ref={canvasRef} className="block max-w-none" />
            {hasSourcePdf && pageCount > 0 ? (
              <div
                ref={overlayRef}
                className="absolute left-0 top-0 touch-none"
                style={{ pointerEvents: pdfReady ? "auto" : "none" }}
                onPointerDown={onOverlayPointerDown}
                onPointerMove={onOverlayPointerMove}
                onPointerUp={onOverlayPointerUp}
                onPointerCancel={(e) => {
                  dragRef.current = null;
                  setDragPreview(null);
                  try {
                    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                {dragPreview && dragPreview.w >= 1 && dragPreview.h >= 1 ? (
                  <div
                    className="pointer-events-none absolute z-20 box-border border-2 border-dashed border-primary bg-primary/20"
                    style={{
                      left: dragPreview.x,
                      top: dragPreview.y,
                      width: dragPreview.w,
                      height: dragPreview.h,
                    }}
                    aria-hidden
                  />
                ) : null}
                {fieldsThisPage.map((f) => {
                  const { rectNorm } = f;
                  const chrome = assigneeFieldChrome(f.assignee);
                  const fl = rectNorm.x * W;
                  const ft = rectNorm.y * H;
                  const fw = Math.max(4, rectNorm.w * W);
                  const fh = Math.max(4, rectNorm.h * H);
                  return (
                    <div
                      key={f.id}
                      className="absolute"
                      style={{
                        left: fl,
                        top: ft,
                        width: fw,
                        height: fh,
                      }}
                    >
                      <button
                        type="button"
                        className={`absolute inset-0 box-border border-2 touch-none ${chrome.body}`}
                        style={{ cursor: selectedFieldId === f.id ? "grab" : "pointer" }}
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          setSelectedFieldId(f.id);
                          beginMove(ev, f.id);
                        }}
                      />
                      {selectedFieldId === f.id
                        ? ALL_HANDLES.map((h) => (
                            <div
                              key={h}
                              role="presentation"
                              className={`absolute z-30 rounded-sm border-2 bg-background shadow-sm ${chrome.handle}`}
                              style={{
                                width: HANDLE_PX,
                                height: HANDLE_PX,
                                cursor: cursorForHandle(h),
                                touchAction: "none",
                                ...HANDLE_STYLES[h],
                              }}
                              onPointerDown={(ev) => beginResize(ev, f.id, h)}
                            />
                          ))
                        : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
          {hasSourcePdf && pageCount > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-sm border-2 border-violet-600 bg-violet-500/25 dark:border-violet-400 dark:bg-violet-500/30"
                  aria-hidden
                />
                Sponsor fields
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-sm border-2 border-sky-600 bg-sky-500/25 dark:border-sky-400 dark:bg-sky-500/30"
                  aria-hidden
                />
                Investor fields
              </span>
            </div>
          ) : null}
        </div>

        <div className="min-w-[240px] flex-1 space-y-3">
          <div className="font-medium text-sm">Selected field</div>
          {!selected ? (
            <p className="text-xs text-muted-foreground">Click a box or draw a new one on the PDF.</p>
          ) : (
            <div className="space-y-3 rounded-xl border border-border/80 p-3">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  className="rounded-lg text-sm"
                  value={selected.label ?? ""}
                  onChange={(e) => updateSelected({ label: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select
                  value={selected.fieldType}
                  onValueChange={(v) => updateSelected({ fieldType: v as EsignFieldType })}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="signature">Signature (image in box)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Completed by</Label>
                <Select
                  value={selected.assignee}
                  onValueChange={(v) => updateSelected({ assignee: v as EsignFieldAssignee })}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sponsor">Sponsor</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id={`tpl-field-required-${props.templateId}-${selected.id}`}
                  checked={selected.required !== false}
                  onCheckedChange={(v) => updateSelected({ required: v === true })}
                />
                <Label
                  htmlFor={`tpl-field-required-${props.templateId}-${selected.id}`}
                  className="cursor-pointer text-xs font-normal"
                >
                  Required
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="destructive" size="sm" className="rounded-lg" onClick={deleteSelected}>
                  <Trash2 className="mr-1 size-4" />
                  Remove
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
