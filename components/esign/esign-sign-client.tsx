"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  loadPdfDocumentFromBuffer,
  SignPdfFieldLayer,
  type PlacedSignField,
} from "@/components/esign/sign-pdf-layer";

type SessionInfo = {
  envelopeId: string;
  role: "sponsor" | "investor" | "lp";
  templateName: string;
  fields: PlacedSignField[];
  contextKind: string;
  prefill?: Record<string, string>;
  /** Logged-in user email from session cookie (for sponsor/investor prefill) */
  sessionEmailHint?: string | null;
};

const PDF_EMBED_FRAGMENT = "#view=FitH&navpanes=0";
const TAB_EMAIL = 1;
const TAB_NAME = 2;
const TAB_FIELD_BASE = 10;
const TAB_SIGNATURE_PAD = 800;
const TAB_CONSENT = 801;
const TAB_SUBMIT = 802;

export function EsignSignClient(props: { initialToken: string }) {
  const [token] = React.useState(props.initialToken);
  const [session, setSession] = React.useState<SessionInfo | null>(null);
  const [loadingSession, setLoadingSession] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [consent, setConsent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const drawing = React.useRef(false);
  const [signerEmail, setSignerEmail] = React.useState("");
  const [signerName, setSignerName] = React.useState("");

  const [pdfDoc, setPdfDoc] = React.useState<Awaited<ReturnType<typeof loadPdfDocumentFromBuffer>> | null>(null);
  const [pdfError, setPdfError] = React.useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = React.useState(false);
  const [doneMessage, setDoneMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setError("Missing token");
      setLoadingSession(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/esign/sign-session?token=${encodeURIComponent(token)}`, {
          credentials: "include",
        });
        const json = (await res.json()) as SessionInfo & { error?: string; sessionEmailHint?: string | null };
        if (!res.ok) {
          throw new Error(json.error ?? "Could not load signing session");
        }
        if (!cancelled) {
          const s = json as SessionInfo;
          setSession(s);
          if (typeof json.sessionEmailHint === "string" && json.sessionEmailHint.trim()) {
            setSignerEmail(json.sessionEmailHint.trim().toLowerCase());
          }
          const initial: Record<string, string> = {};
          if (s.prefill) {
            for (const f of s.fields) {
              if (f.fieldType === "signature") continue;
              const v = s.prefill[f.id];
              if (v != null && String(v).trim() !== "") initial[f.id] = String(v).trim();
            }
          }
          setValues(initial);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  React.useEffect(() => {
    if (!token || !session) return;
    setPdfDoc(null);
    setPdfError(null);
    setLoadingPdf(true);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/esign/sign-document?token=${encodeURIComponent(token)}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Could not load PDF preview");
        const buf = await res.arrayBuffer();
        const doc = await loadPdfDocumentFromBuffer(buf);
        if (!cancelled) setPdfDoc(doc);
      } catch (e) {
        if (!cancelled) setPdfError(e instanceof Error ? e.message : "PDF load failed");
      } finally {
        if (!cancelled) setLoadingPdf(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, session]);

  const tabIndexForFieldId = React.useMemo(() => {
    const fields = session?.fields.filter((f) => f.fieldType !== "signature") ?? [];
    const sorted = [...fields].sort(
      (a, b) =>
        a.pageIndex - b.pageIndex || a.rectNorm.y - b.rectNorm.y || a.rectNorm.x - b.rectNorm.x,
    );
    const m = new Map<string, number>();
    sorted.forEach((f, i) => m.set(f.id, TAB_FIELD_BASE + i));
    return (id: string) => m.get(id) ?? -1;
  }, [session]);

  function clearCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }

  React.useEffect(() => {
    clearCanvas();
  }, [session]);

  function canvasToPngBase64(): Promise<string> {
    const c = canvasRef.current;
    if (!c) return Promise.resolve("");
    return Promise.resolve(c.toDataURL("image/png"));
  }

  function pointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!ctx || !c) return;
    const r = c.getBoundingClientRect();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  }

  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!ctx || !c) return;
    const r = c.getBoundingClientRect();
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
    ctx.stroke();
  }

  function pointerUp() {
    drawing.current = false;
  }

  async function submit() {
    if (!session || !token) return;
    if (!consent) {
      toast.error("Confirm consent to continue");
      return;
    }
    const emailFromDom =
      typeof document !== "undefined"
        ? (document.getElementById("esign-signer-email") as HTMLInputElement | null)?.value?.trim() ?? ""
        : "";
    const effectiveSignerEmail = signerEmail.trim() || emailFromDom;
    if ((session.role === "sponsor" || session.role === "investor") && !effectiveSignerEmail) {
      toast.error("Enter your email (must match the invited address)");
      return;
    }
    setSubmitting(true);
    try {
      const signaturePngBase64 = await canvasToPngBase64();
      const res = await fetch("/api/esign/sign-complete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          fieldValues: values,
          signaturePngBase64,
          consent: true,
          signerEmail: effectiveSignerEmail || undefined,
          signerName: signerName.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        completed?: boolean;
        nextUrl?: string | null;
      };
      if (!res.ok) throw new Error(json.error ?? "Submit failed");
      if (json.completed) {
        const msg = "Signing complete — you can close this page.";
        setDoneMessage(msg);
        toast.success(msg);
        return;
      }
      if (json.nextUrl) {
        const msg = "Signature captured. The next signer has been notified.";
        setDoneMessage(msg);
        toast.success(msg);
        return;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!session) return null;

  const showEmailForm = session.role === "sponsor" || session.role === "investor";
  const pdfSrcBase =
    token.length > 0 ? `/api/esign/sign-document?token=${encodeURIComponent(token)}` : null;

  return (
    <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,2.1fr)_minmax(300px,26rem)] xl:items-start xl:gap-8">
      <div className="order-2 min-w-0 space-y-3 xl:order-1 xl:sticky xl:top-4">
        <div>
          <h2 className="text-sm font-medium text-foreground">Document</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Fill fields on the pages (use Tab to move in order), then complete the signature and submit in the panel on
            the right.
          </p>
        </div>

        {loadingPdf ? <p className="text-sm text-muted-foreground">Rendering PDF…</p> : null}
        {pdfError ? (
          <p className="text-sm text-destructive">
            {pdfError}
            {pdfSrcBase ? (
              <>
                {" "}
                <a
                  className="font-medium underline underline-offset-2"
                  href={`${pdfSrcBase}${PDF_EMBED_FRAGMENT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open PDF in a new tab
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        {pdfDoc ? (
          <SignPdfFieldLayer
            pdf={pdfDoc}
            fields={session.fields}
            values={values}
            onFieldChange={(id, value) => setValues((prev) => ({ ...prev, [id]: value }))}
            tabIndexForFieldId={tabIndexForFieldId}
          />
        ) : null}
      </div>

      <div className="order-1 min-w-0 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-md xl:order-2 xl:sticky xl:top-4">
        <div>
          <h1 className="text-xl font-semibold">{session.templateName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your drawing is applied to every signature box on the document and to the certificate page.
          </p>
          {doneMessage ? (
            <p className="mt-2 rounded-md border border-emerald-300/70 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {doneMessage}
            </p>
          ) : null}
        </div>

        {showEmailForm ? (
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="se">Your email</Label>
              <Input
                id="esign-signer-email"
                tabIndex={TAB_EMAIL}
                type="email"
                autoComplete="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className="rounded-xl"
                placeholder="you@company.com"
              />
              <p className="text-[11px] text-muted-foreground">Must match the email used for this signing request.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sn">Display name</Label>
              <Input
                id="sn"
                tabIndex={TAB_NAME}
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="rounded-xl"
                placeholder="Optional"
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="sig-canvas">Signature</Label>
            <Button type="button" variant="ghost" size="sm" onClick={() => clearCanvas()}>
              Clear
            </Button>
          </div>
          <canvas
            id="sig-canvas"
            ref={canvasRef}
            tabIndex={TAB_SIGNATURE_PAD}
            width={400}
            height={120}
            className="w-full touch-none rounded-xl border border-border bg-white outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerLeave={pointerUp}
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            tabIndex={TAB_CONSENT}
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
          />
          <span>I agree to sign electronically and understand this signature is legally binding.</span>
        </label>

        <Button
          type="button"
          tabIndex={TAB_SUBMIT}
          className="w-full rounded-xl"
          disabled={submitting || doneMessage != null}
          onClick={() => void submit()}
        >
          {submitting ? "Submitting…" : doneMessage ? "Submitted" : "Sign and submit"}
        </Button>
      </div>
    </div>
  );
}
