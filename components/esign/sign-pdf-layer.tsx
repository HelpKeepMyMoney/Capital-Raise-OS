"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Must match `components/settings/esign-template-field-editor.tsx` — normalized rects are relative to this viewport. */
export const ESIGN_PDF_VIEW_SCALE = 1.25;

export type PlacedSignField = {
  id: string;
  label: string;
  fieldType: "text" | "date" | "signature";
  required: boolean;
  pageIndex: number;
  rectNorm: { x: number; y: number; w: number; h: number };
};

type PdfjsModule = typeof import("pdfjs-dist");
type PdfDoc = Awaited<ReturnType<PdfjsModule["getDocument"]>["promise"]>;

function SignPdfPageView(props: {
  pdf: PdfDoc;
  pageIndex: number;
  scale: number;
  children?: React.ReactNode;
}) {
  const { pdf, pageIndex, scale, children } = props;
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    void (async () => {
      const page = await pdf.getPage(pageIndex + 1);
      const vp = page.getViewport({ scale });
      if (cancelled) return;
      setSize({ w: vp.width, h: vp.height });
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
    })();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageIndex, scale]);

  return (
    <div
      className="relative mx-auto mb-6 overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      style={size ? { width: size.w, height: size.h } : { minHeight: 220 }}
    >
      <canvas ref={canvasRef} className="block" />
      {size ? (
        <div className="pointer-events-none absolute left-0 top-0 z-[1] h-full w-full [&_input]:pointer-events-auto">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function SignPdfFieldLayer(props: {
  pdf: PdfDoc | null;
  fields: PlacedSignField[];
  values: Record<string, string>;
  onFieldChange: (id: string, value: string) => void;
  tabIndexForFieldId: (id: string) => number;
}) {
  const { pdf, fields, values, onFieldChange, tabIndexForFieldId } = props;

  if (!pdf) {
    return <p className="text-sm text-muted-foreground">Loading document pages…</p>;
  }

  const numPages = pdf.numPages;

  return (
    <div className="space-y-2">
      {Array.from({ length: numPages }, (_, pIdx) => {
        const pageFields = fields
          .filter((f) => f.pageIndex === pIdx)
          .sort((a, b) => a.rectNorm.y - b.rectNorm.y || a.rectNorm.x - b.rectNorm.x);

        return (
          <SignPdfPageView key={pIdx} pdf={pdf} pageIndex={pIdx} scale={ESIGN_PDF_VIEW_SCALE}>
            {pageFields.map((f) => {
              const { rectNorm } = f;
              const commonStyle: React.CSSProperties = {
                left: `${rectNorm.x * 100}%`,
                top: `${rectNorm.y * 100}%`,
                width: `${rectNorm.w * 100}%`,
                height: `${rectNorm.h * 100}%`,
              };

              if (f.fieldType === "signature") {
                return (
                  <div
                    key={f.id}
                    className={cn(
                      "pointer-events-none absolute box-border rounded-sm border-2 border-dashed border-primary/70 bg-primary/5",
                    )}
                    style={commonStyle}
                    title={f.label}
                  >
                    <span className="block px-0.5 pt-0.5 text-[9px] font-medium leading-none text-primary/90">
                      Signature
                    </span>
                  </div>
                );
              }

              const isDate = f.fieldType === "date";
              return (
                <div key={f.id} className="absolute box-border" style={commonStyle}>
                  <Input
                    id={`field-${f.id}`}
                    tabIndex={tabIndexForFieldId(f.id)}
                    type={isDate ? "date" : "text"}
                    value={values[f.id] ?? ""}
                    onChange={(e) => onFieldChange(f.id, e.target.value)}
                    aria-label={f.label + (f.required ? " (required)" : "")}
                    title={f.label}
                    className={cn(
                      "h-full min-h-0 w-full rounded border-2 border-primary/80 bg-background/95 px-1 py-0 text-xs shadow-sm",
                      "placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    autoComplete="off"
                  />
                </div>
              );
            })}
          </SignPdfPageView>
        );
      })}
    </div>
  );
}

export async function loadPdfDocumentFromBuffer(data: ArrayBuffer): Promise<PdfDoc> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`;
  return pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
}
