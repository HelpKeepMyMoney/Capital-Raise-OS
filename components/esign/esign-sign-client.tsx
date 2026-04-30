"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type SessionInfo = {
  envelopeId: string;
  role: "sponsor" | "investor" | "lp";
  templateName: string;
  fields: { id: string; label: string; fieldType: "text" | "date" | "signature"; required: boolean }[];
  contextKind: string;
};

export function EsignSignClient(props: { initialToken: string }) {
  const [token] = React.useState(props.initialToken);
  const [session, setSession] = React.useState<SessionInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [consent, setConsent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const drawing = React.useRef(false);
  const [signerEmail, setSignerEmail] = React.useState("");
  const [signerName, setSignerName] = React.useState("");

  React.useEffect(() => {
    if (!token) {
      setError("Missing token");
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/esign/sign-session?token=${encodeURIComponent(token)}`);
        const json = (await res.json()) as SessionInfo & { error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? "Could not load signing session");
        }
        if (!cancelled) setSession(json as SessionInfo);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
    if ((session.role === "sponsor" || session.role === "investor") && !signerEmail.trim()) {
      toast.error("Enter your email (must match the invited address)");
      return;
    }
    setSubmitting(true);
    try {
      const signaturePngBase64 = await canvasToPngBase64();
      const res = await fetch("/api/esign/sign-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          fieldValues: values,
          signaturePngBase64,
          consent: true,
          signerEmail: signerEmail.trim() || undefined,
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
        toast.success("Signing complete — you can close this page.");
        return;
      }
      if (json.nextUrl) {
        toast.message("Next signer link ready — redirecting");
        window.location.href = json.nextUrl;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!session) return null;

  const showEmailForm = session.role === "sponsor" || session.role === "investor";

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-md">
      <div>
        <h1 className="text-xl font-semibold">{session.templateName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete the fields below, then draw your signature. Your signature is placed on the certificate page and in any
          signature boxes defined on the document.
        </p>
      </div>

      {showEmailForm ? (
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label htmlFor="se">Your email</Label>
            <Input
              id="se"
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
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="rounded-xl"
              placeholder="Optional"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {session.fields.map((f) => (
          <div key={f.id} className="space-y-2">
            {f.fieldType === "signature" ? (
              <>
                <Label>{f.label}</Label>
                <p className="text-sm text-muted-foreground">
                  Your drawn signature below will be scaled into this area on the PDF (same image as on the certificate).
                </p>
              </>
            ) : (
              <>
                <Label htmlFor={f.id}>
                  {f.label}
                  {f.required ? " *" : ""}
                </Label>
                <Input
                  id={f.id}
                  type={f.fieldType === "date" ? "date" : "text"}
                  value={values[f.id] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                  className="rounded-xl"
                />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Signature</Label>
          <Button type="button" variant="ghost" size="sm" onClick={() => clearCanvas()}>
            Clear
          </Button>
        </div>
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className="w-full touch-none rounded-xl border border-border bg-white"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
        <span>I agree to sign electronically and understand this signature is legally binding.</span>
      </label>

      <Button type="button" className="w-full rounded-xl" disabled={submitting} onClick={() => void submit()}>
        {submitting ? "Submitting…" : "Sign and submit"}
      </Button>
    </div>
  );
}
