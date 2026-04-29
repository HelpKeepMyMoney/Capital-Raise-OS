"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { fetchInviteValidation } from "@/lib/invitations/client-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trackGa4, GA4_EVENTS } from "@/lib/analytics/client-track";

export function SignupForm() {
  const router = useRouter();
  const search = useSearchParams();
  const inviteToken = search.get("invite")?.trim() ?? "";
  const inviteMode = inviteToken.length > 0;

  const [inviteStatus, setInviteStatus] = React.useState<
    "idle" | "loading" | "ready" | "error"
  >(inviteMode ? "loading" : "idle");
  const [inviteOrgName, setInviteOrgName] = React.useState("");
  const [inviteDealLabel, setInviteDealLabel] = React.useState<string | null>(null);
  const [lockedEmail, setLockedEmail] = React.useState<string | null>(null);
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [orgName, setOrgName] = React.useState("My Raise");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!inviteMode) {
      setInviteStatus("idle");
      return;
    }
    let cancelled = false;
    (async () => {
      setInviteStatus("loading");
      const result = await fetchInviteValidation(inviteToken);
      if (cancelled) return;
      if (!result.ok) {
        setInviteError(result.error);
        setInviteStatus("error");
        return;
      }
      setInviteOrgName(result.data.organizationName);
      if (result.data.scope === "deal" && result.data.dealTitle) {
        setInviteDealLabel(result.data.dealTitle);
      } else {
        setInviteDealLabel(null);
      }
      if (result.data.emailRequired && result.data.inviteEmail) {
        setLockedEmail(result.data.inviteEmail);
        setEmail(result.data.inviteEmail);
      }
      setInviteStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteMode, inviteToken]);

  const emailReadOnly = Boolean(lockedEmail);
  const showFounderHero = !inviteMode;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    trackGa4(GA4_EVENTS.signup_started, { flow: inviteMode ? "signup_invite" : "signup" });
    try {
      const trimmed = email.trim().toLowerCase();
      if (inviteMode && lockedEmail && trimmed !== lockedEmail) {
        toast.error(`Use the invited email address (${lockedEmail}).`);
        setLoading(false);
        return;
      }

      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, trimmed, password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          inviteMode
            ? { idToken, inviteRawToken: inviteToken }
            : { idToken, organizationName: orgName },
        ),
      });

      const j = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(j.error ?? `Server error (${res.status})`);
      }

      trackGa4(GA4_EVENTS.signup_completed, {
        flow: inviteMode ? "signup_invite" : "signup",
      });

      if (inviteMode) {
        router.replace(`/invite/${encodeURIComponent(inviteToken)}`);
      } else {
        router.replace("/dashboard");
      }
      router.refresh();
    } catch (err) {
      const fb = err as FirebaseError;
      const apiKeyProblem =
        (fb?.code?.includes?.("api-key") ?? false) ||
        (fb?.message?.toLowerCase?.().includes?.("api key") ?? false);
      if (apiKeyProblem) {
        toast.error(
          "Invalid Firebase Web API key. Copy apiKey from Firebase Console → Project settings → Web app into NEXT_PUBLIC_FIREBASE_API_KEY. In Google Cloud → Credentials, open the Browser key: allow Identity Toolkit API; for localhost use no referrer restriction or add http://localhost:3000/*. Restart dev server after editing .env.",
        );
      } else if (fb?.code?.startsWith?.("auth/")) {
        const hints: Record<string, string> = {
          "auth/operation-not-allowed":
            "Email/Password is turned off. Firebase Console → Authentication → Sign-in method → enable Email/Password.",
          "auth/email-already-in-use":
            "That email is already registered. Use Sign in instead, then accept the invitation.",
          "auth/invalid-email": "That email address looks invalid.",
          "auth/weak-password":
            "Password is too weak. Firebase requires at least 6 characters — try a longer one.",
        };
        toast.error(hints[fb.code] ?? `${fb.code}: ${fb.message}`);
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Sign up failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  const loadingInvite = inviteMode && inviteStatus === "loading";
  const inviteBroken = inviteMode && inviteStatus === "error";

  return (
    <div className="space-y-6">
      {showFounderHero ? (
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Create your workspace</h2>
          <p className="text-sm text-muted-foreground">Founder-led onboarding with Firebase Auth</p>
        </div>
      ) : loadingInvite ? (
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Loading invitation…</h2>
          <p className="text-sm text-muted-foreground">Hang on while we fetch the organization details.</p>
        </div>
      ) : inviteBroken ? (
        <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-center text-sm">
          <p className="font-medium text-destructive">Could not load invitation</p>
          <p className="text-muted-foreground">{inviteError}</p>
        </div>
      ) : inviteMode ? (
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {inviteOrgName ? `Join ${inviteOrgName}` : "You're invited"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {inviteDealLabel
              ? `Create a password for your account to access “${inviteDealLabel}” and materials shared with investors.`
              : `Create a password for your account — you’ll get access to ${inviteOrgName || "their"} investor portal.`}
          </p>
          {inviteOrgName ? (
            <p className="text-xs text-muted-foreground">
              You&apos;re joining <strong className="text-foreground">{inviteOrgName}</strong> —
              only a password is required below
              {emailReadOnly ? (
                <>
                  {" "}
                  (your email matches the invitation automatically).
                </>
              ) : (
                <>
                  {" "}
                  plus the email address you&apos;ll sign in with.
                </>
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        {!inviteMode ? (
          <div className="space-y-2">
            <Label htmlFor="org">Organization</Label>
            <Input id="org" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
          </div>
        ) : null}

        {(inviteMode && inviteStatus === "ready") || !inviteMode ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="signup-email">{emailReadOnly ? "Your email (from invitation)" : "Email"}</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => (!emailReadOnly ? setEmail(e.target.value) : undefined)}
                readOnly={emailReadOnly}
                tabIndex={emailReadOnly ? -1 : 0}
                className={
                  emailReadOnly ? "cursor-not-allowed bg-muted font-mono text-sm text-foreground" : undefined
                }
                aria-readonly={emailReadOnly || undefined}
                required
              />
              {emailReadOnly ? (
                <p className="text-xs text-muted-foreground">
                  This invitation was sent to this address — it must match when you accept the invite.
                </p>
              ) : null}
              {!inviteMode ? null : !emailReadOnly ? (
                <p className="text-xs text-muted-foreground">
                  Use the same email address the issuer used when they invited you (check the invite email).
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Create password</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                placeholder="Min. 6 characters"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                (inviteMode && (inviteStatus !== "ready" || inviteBroken))
              }
            >
              {loading ? "Creating account…" : inviteMode ? "Create account & continue" : "Create account"}
            </Button>
          </>
        ) : null}
      </form>
    </div>
  );
}

/** Footer link that preserves invite + next when present (client). */
export function SignupSignInLink() {
  const search = useSearchParams();
  const invite = search.get("invite")?.trim();
  const next = search.get("next");
  const href = (() => {
    if (!invite) {
      return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
    }
    const returnTo =
      next?.trim() ?? `/invite/${encodeURIComponent(invite)}`;
    return `/login?invite=${encodeURIComponent(invite)}&next=${encodeURIComponent(returnTo)}`;
  })();
  return (
    <p className="text-center text-sm text-muted-foreground">
      Already have an account?{" "}
      <Link href={href} className="font-medium text-link underline underline-offset-4 hover:text-link-hover">
        Sign in
      </Link>
    </p>
  );
}
