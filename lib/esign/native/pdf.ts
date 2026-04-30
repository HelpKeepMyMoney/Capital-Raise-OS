import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { EsignTemplateField } from "@/lib/firestore/types";

const ISO_DATE_FMT = /^(\d{4})-(\d{2})-(\d{2})$/;

export function normalizeDateFieldValue(raw: string): string {
  const t = raw.trim();
  if (ISO_DATE_FMT.test(t)) return t;
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return t;
}

/** Normalized rect: x,y from top-left of page, 0–1. PDF origin bottom-left. */
function rectToPdfCoords(
  page: PDFPage,
  rect: EsignTemplateField["rectNorm"],
): { x: number; y: number; w: number; h: number } {
  const { width, height } = page.getSize();
  const w = Math.max(0.01, rect.w) * width;
  const h = Math.max(0.01, rect.h) * height;
  const x = rect.x * width;
  const yTop = rect.y * height;
  const yPdf = height - yTop - h;
  return { x, y: yPdf, w, h };
}

export async function drawFieldsOnPdf(
  pdfBytes: Uint8Array,
  fields: EsignTemplateField[],
  fieldValues: Record<string, string>,
  options: { onlyAssignee?: "sponsor" | "investor"; signaturePngBytes?: Uint8Array },
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  let sigImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  const png = options.signaturePngBytes;
  if (png != null && png.length > 0) {
    try {
      sigImage = await doc.embedPng(png);
    } catch {
      sigImage = null;
    }
  }

  for (const f of fields) {
    if (options.onlyAssignee && f.assignee !== options.onlyAssignee) continue;

    if (f.fieldType === "signature") {
      if (!sigImage) continue;
      const page = pages[f.pageIndex];
      if (!page) continue;
      const { x, y, w, h } = rectToPdfCoords(page, f.rectNorm);
      const iw = sigImage.width;
      const ih = sigImage.height;
      if (iw <= 0 || ih <= 0) continue;
      const scale = Math.min(w / iw, h / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const cx = x + (w - dw) / 2;
      const cy = y + (h - dh) / 2;
      page.drawImage(sigImage, { x: cx, y: cy, width: dw, height: dh });
      continue;
    }

    const raw = fieldValues[f.id];
    if (raw == null || String(raw).trim() === "") continue;
    let text = String(raw).trim();
    if (f.fieldType === "date") text = normalizeDateFieldValue(text);
    const page = pages[f.pageIndex];
    if (!page) continue;
    const { x, y, w, h } = rectToPdfCoords(page, f.rectNorm);
    const size = Math.max(6, Math.min(14, h * 0.55));
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0.05, 0.05, 0.08),
      maxWidth: w,
    });
  }
  return doc.save();
}

export async function appendCertificatePage(
  doc: PDFDocument,
  opts: {
    signerName: string;
    signerEmail: string;
    signedAtIso: string;
    signaturePngBytes: Uint8Array;
  },
): Promise<void> {
  const page = doc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const sig = await doc.embedPng(opts.signaturePngBytes);
  const sigDim = sig.scale(0.35);
  const margin = 48;
  let y = height - margin;
  page.drawText("Electronic signature certificate", {
    x: margin,
    y,
    size: 16,
    font: bold,
    color: rgb(0.1, 0.1, 0.12),
  });
  y -= 36;
  const lines = [
    `Signer: ${opts.signerName}`,
    `Email: ${opts.signerEmail}`,
    `Timestamp (UTC): ${opts.signedAtIso}`,
    "The signer confirmed intent to sign electronically and agreed to the terms shown on the signing page.",
  ];
  for (const line of lines) {
    page.drawText(line, {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.22),
      maxWidth: width - margin * 2,
    });
    y -= 18;
  }
  y -= 12;
  page.drawText("Signature:", { x: margin, y, size: 11, font: bold, color: rgb(0.1, 0.1, 0.12) });
  y -= 8;
  page.drawImage(sig, {
    x: margin,
    y: y - sigDim.height,
    width: sigDim.width,
    height: sigDim.height,
  });
}

export async function finalizePdfWithSignature(
  pdfBytes: Uint8Array,
  fields: EsignTemplateField[],
  fieldValues: Record<string, string>,
  opts: {
    onlyAssignee?: "sponsor" | "investor";
    signerName: string;
    signerEmail: string;
    signaturePngBytes: Uint8Array;
    signedAtMs?: number;
  },
): Promise<Uint8Array> {
  let bytes = await drawFieldsOnPdf(pdfBytes, fields, fieldValues, {
    onlyAssignee: opts.onlyAssignee,
    signaturePngBytes: opts.signaturePngBytes,
  });
  const doc = await PDFDocument.load(bytes);
  const iso = new Date(opts.signedAtMs ?? Date.now()).toISOString();
  await appendCertificatePage(doc, {
    signerName: opts.signerName,
    signerEmail: opts.signerEmail,
    signedAtIso: iso,
    signaturePngBytes: opts.signaturePngBytes,
  });
  return doc.save();
}
