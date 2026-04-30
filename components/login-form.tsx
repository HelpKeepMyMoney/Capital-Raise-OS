"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { fetchInviteValidation } from "@/lib/invitations/client-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trackGa4, GA4_EVENTS } from "@/lib/analytics/client-track";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/dashboard";
  const inviteToken = search.get("invite")?.trim() ?? "";
  const nextParam = search.get("next");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [inviteOrgName, setInviteOrgName] = React.useState<string | null>(null);
  const [lockedInviteEmail, setLockedInviteEmail] = React.useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = React.useState(inviteToken.length > 0);

  React.useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      setInviteLoading(true);
      const result = await fetchInviteValidation(inviteToken);
      if (cancelled) return;
      if (!result.ok) {
        setInviteOrgName(null);
        setLockedInviteEmail(null);
      } else {
        setInviteOrgName(result.data.organizationName || null);
        if (result.data.emailRequired && result.data.inviteEmail) {
          setLockedInviteEmail(result.data.inviteEmail);
          setEmail(result.data.inviteEmail);
        }
      }
      setInviteLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const emailReadOnly = Boolean(lockedInviteEmail);

  const forgotPasswordHref = React.useMemo(() => {
    const qs = new URLSearchParams();
    const trimmed = email.trim();
    if (trimmed) qs.set("email", trimmed);
    if (inviteToken) qs.set("invite", inviteToken);
    if (nextParam?.trim()) qs.set("next", nextParam.trim());
    const q = qs.toString();
    return q ? `/forgot-password?${q}` : "/forgot-password";
  }, [email, inviteToken, nextParam]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    trackGa4(GA4_EVENTS.signup_started, { flow: "login" });
    try {
      const auth = getFirebaseAuth();
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password,
      );
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Session failed (${res.status})`);
      }
      trackGa4(GA4_EVENTS.signup_completed, { flow: "login" });
      router.push(next);
      router.refresh();
    } catch (err) {
      const fb = err as FirebaseError;
      const code = fb?.code ?? "";
      const apiKeyProblem =
        code.includes("api-key") || (fb?.message?.toLowerCase?.().includes("api key") ?? false);
      if (apiKeyProblem) {
        toast.error(
          "Invalid Firebase Web API key. Firebase Console → Project settings → your Web app: copy apiKey into NEXT_PUBLIC_FIREBASE_API_KEY. Google Cloud → APIs & Services → Credentials → Browser key: set API restrictions to include Identity Toolkit API (or none for dev); Application restrictions: None or add http://localhost:3000/*. Restart npm run dev after .env changes.",
        );
      } else if (fb?.code?.startsWith?.("auth/")) {
        const hints: Record<string, string> = {
          "auth/api-key-not-valid":
            "Invalid Firebase Web API key — fix credentials and key restrictions (see toast above if shown).",
          "auth/invalid-credential":
            "Wrong email or password, or this account uses a different sign-in method.",
          "auth/user-not-found":
            inviteToken && inviteOrgName ? "No account yet — create one first from the signup link." : "No account for this email. Create one on the sign-up page.",
          "auth/wrong-password": "Incorrect password.",
          "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
          "auth/user-disabled": "This account has been disabled.",
        };
        toast.error(hints[fb.code] ?? `${fb.code}: ${fb.message}`);
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Sign in failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {inviteToken && inviteLoading ? (
        <p className="text-center text-sm text-muted-foreground">Loading invitation details…</p>
      ) : null}
      {inviteToken && inviteOrgName && !inviteLoading ? (
        <p className="text-center text-sm text-muted-foreground">
          Signing in to continue to{" "}
          <strong className="text-foreground">{inviteOrgName}</strong>.
        </p>
      ) : null}
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">{emailReadOnly ? "Email (from invitation)" : "Email"}</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => (!emailReadOnly ? setEmail(e.target.value) : undefined)}
            readOnly={emailReadOnly}
            tabIndex={emailReadOnly ? -1 : 0}
            className={emailReadOnly ? "cursor-not-allowed bg-muted font-mono text-sm text-foreground" : undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || (inviteLoading && !!inviteToken)}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-sm">
          <Link
            href={forgotPasswordHref}
            className="font-medium text-link underline underline-offset-4 hover:text-link-hover"
          >
            Forgot password?
          </Link>
        </p>
      </form>
    </div>
  );
}
