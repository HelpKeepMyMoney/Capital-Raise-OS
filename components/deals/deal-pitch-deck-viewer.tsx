"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "forbidden" | "not_pdf" | "error";

export function DealPitchDeckViewer(props: {
  dealId: string;
  documentId: string;
  documentName: string;
  /** When false, skip pdf.js and show link to data room. */
  isLikelyPdf: boolean;
  className?: string;
}) {
  const shellRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const pdfRef = React.useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const drawTokenRef = React.useRef(0);
  /** pdf.js forbids concurrent `render()` on the same canvas — cancel the previous task first. */
  const activeRenderTaskRef = React.useRef<{ cancel: () => void } | null>(null);

  const [loadState, setLoadState] = React.useState<LoadState>(
    props.isLikelyPdf ? "loading" : "not_pdf",
  );
  const [errorHint, setErrorHint] = React.useState<string | null>(null);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [numPages, setNumPages] = React.useState(0);
  const [viewportEpoch, setViewportEpoch] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth);
      setViewportEpoch((e) => e + 1);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [loadState]);

  React.useEffect(() => {
    if (!props.isLikelyPdf) {
      setLoadState("not_pdf");
      return;
    }

    let cancelled = false;
    pdfRef.current = null;
    setLoadState("loading");
    setErrorHint(null);

    void (async () => {
      try {
        const filePath = `/api/data-room/documents/${encodeURIComponent(props.documentId)}/file`;
        const fileRes = await fetch(filePath, { credentials: "same-origin" });

        if (cancelled) return;
        if (fileRes.status === 403) {
          let msg = "You may need to complete the sponsor’s NDA first.";
          try {
            const j = (await fileRes.json()) as { error?: string };
            if (typeof j.error === "string" && j.error) msg = j.error;
          } catch {
            /* ignore */
          }
          setLoadState("forbidden");
          setErrorHint(msg);
          return;
        }
        if (!fileRes.ok) {
          let msg = "Could not load the document.";
          try {
            const j = (await fileRes.json()) as { error?: string };
            if (typeof j.error === "string" && j.error) msg = j.error;
          } catch {
            /* ignore */
          }
          setLoadState("error");
          setErrorHint(msg);
          return;
        }

        const buf = await fileRes.arrayBuffer();

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`;

        let pdf: import("pdfjs-dist").PDFDocumentProxy;
        try {
          pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        } catch {
          if (!cancelled) {
            setLoadState("not_pdf");
            setErrorHint(null);
          }
          return;
        }

        if (cancelled) {
          await pdf.destroy().catch(() => {});
          return;
        }

        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setPageIndex(0);
        setLoadState("ready");
      } catch {
        if (!cancelled) {
          setLoadState("error");
          setErrorHint("Something went wrong loading the deck.");
        }
      }
    })();

    return () => {
      cancelled = true;
      activeRenderTaskRef.current?.cancel();
      activeRenderTaskRef.current = null;
      drawTokenRef.current += 1;
      const p = pdfRef.current;
      pdfRef.current = null;
      if (p) void p.destroy().catch(() => {});
    };
  }, [props.documentId, props.isLikelyPdf]);

  const renderPage = React.useCallback(async (pageIdx: number, widthPx: number) => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || widthPx <= 0) return;

    activeRenderTaskRef.current?.cancel();
    activeRenderTaskRef.current = null;

    const token = ++drawTokenRef.current;
    const page = await pdf.getPage(pageIdx + 1);
    if (token !== drawTokenRef.current) return;

    const base = page.getViewport({ scale: 1 });
    const maxW = Math.max(280, widthPx - 48);
    const scale = maxW / base.width;
    const viewport = page.getViewport({ scale });

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const task = page.render({ canvasContext: ctx, viewport });
    activeRenderTaskRef.current = task;
    try {
      await task.promise;
    } catch {
      /* cancelled or torn down */
    }
    if (token !== drawTokenRef.current) return;
    if (activeRenderTaskRef.current === task) activeRenderTaskRef.current = null;
  }, []);

  React.useEffect(() => {
    if (loadState !== "ready" || numPages <= 0 || containerWidth <= 0) return;
    const pdf = pdfRef.current;
    if (!pdf) return;

    let effectAlive = true;
    void (async () => {
      if (!effectAlive) return;
      await renderPage(pageIndex, containerWidth);
    })();

    return () => {
      effectAlive = false;
      activeRenderTaskRef.current?.cancel();
      activeRenderTaskRef.current = null;
      drawTokenRef.current += 1;
    };
  }, [loadState, numPages, pageIndex, containerWidth, viewportEpoch, renderPage]);

  function goPrev() {
    setPageIndex((i) => Math.max(0, i - 1));
  }

  function goNext() {
    setPageIndex((i) => Math.min(numPages - 1, i + 1));
  }

  function toggleFullscreen() {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen().catch(() => {});
    }
  }

  const dataRoomHref = `/data-room?deal=${encodeURIComponent(props.dealId)}`;

  if (loadState === "forbidden") {
    return (
      <section
        className={cn(
          "rounded-2xl border border-border/80 bg-card/90 p-6 text-sm text-muted-foreground shadow-sm",
          props.className,
        )}
      >
        <h2 className="font-heading text-lg font-semibold text-foreground">Pitch deck</h2>
        <p className="mt-2">{errorHint ?? "You can’t view this deck yet."}</p>
        <Link href={dataRoomHref} className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
          Open data room
        </Link>
      </section>
    );
  }

  if (loadState === "not_pdf") {
    return (
      <section
        className={cn(
          "rounded-2xl border border-border/80 bg-card/90 p-6 text-sm text-muted-foreground shadow-sm",
          props.className,
        )}
      >
        <h2 className="font-heading text-lg font-semibold text-foreground">Pitch deck</h2>
        <p className="mt-2">
          This deck isn’t a PDF in the browser. Open the data room to view or download{" "}
          <span className="font-medium text-foreground">{props.documentName}</span>.
        </p>
        <Link href={dataRoomHref} className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
          View in data room
        </Link>
      </section>
    );
  }

  if (loadState === "error") {
    return (
      <section
        className={cn(
          "rounded-2xl border border-border/80 bg-card/90 p-6 text-sm text-muted-foreground shadow-sm",
          props.className,
        )}
      >
        <h2 className="font-heading text-lg font-semibold text-foreground">Pitch deck</h2>
        <p className="mt-2">{errorHint ?? "Could not load the deck."}</p>
        <Link href={dataRoomHref} className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
          Try data room
        </Link>
      </section>
    );
  }

  if (loadState === "loading") {
    return (
      <section
        className={cn(
          "flex min-h-[280px] items-center justify-center rounded-2xl border border-border/80 bg-muted/30 shadow-inner",
          props.className,
        )}
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading pitch deck</span>
      </section>
    );
  }

  return (
    <section className={cn("space-y-3", props.className)}>
      <h2 className="font-heading text-2xl font-bold tracking-tight">Pitch deck</h2>
      <div
        ref={shellRef}
        className="relative overflow-hidden rounded-2xl border border-border/80 bg-zinc-950 shadow-lg dark:bg-black/80"
      >
        <div className="flex min-h-[240px] items-center justify-center px-10 py-8 md:px-14">
          <canvas ref={canvasRef} className="max-h-[min(70vh,820px)] max-w-full shadow-2xl" />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-1 top-1/2 z-10 h-12 w-12 -translate-y-1/2 rounded-full border border-white/10 bg-background/80 text-foreground shadow backdrop-blur hover:bg-background"
          aria-label="Previous slide"
          disabled={pageIndex <= 0}
          onClick={goPrev}
        >
          <ChevronLeft className="size-6" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 z-10 h-12 w-12 -translate-y-1/2 rounded-full border border-white/10 bg-background/80 text-foreground shadow backdrop-blur hover:bg-background"
          aria-label="Next slide"
          disabled={pageIndex >= numPages - 1}
          onClick={goNext}
        >
          <ChevronRight className="size-6" />
        </Button>

        <div className="absolute bottom-3 right-4 rounded-md bg-background/90 px-2.5 py-1 text-xs font-medium tabular-nums text-foreground shadow backdrop-blur">
          {pageIndex + 1}/{numPages}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute bottom-3 left-4 z-10 h-9 w-9 rounded-md border border-white/10 bg-background/80 text-foreground shadow backdrop-blur hover:bg-background"
          aria-label="Fullscreen"
          onClick={toggleFullscreen}
        >
          <Maximize2 className="size-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{props.documentName}</p>
    </section>
  );
}
