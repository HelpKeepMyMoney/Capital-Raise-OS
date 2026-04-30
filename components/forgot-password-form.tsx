"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const search = useSearchParams();
  const prefilled = search.get("email")?.trim() ?? "";

  const [email, setEmail] = React.useState(prefilled);
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  React.useEffect(() => {
    if (prefilled) setEmail(prefilled);
  }, [prefilled]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const trimmed = email.trim().toLowerCase();
      await sendPasswordResetEmail(auth, trimmed, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
      setSent(true);
    } catch (err) {
      const fb = err as FirebaseError;
      const code = fb?.code ?? "";
      const apiKeyProblem =
        code.includes("api-key") || (fb?.message?.toLowerCase?.().includes("api key") ?? false);
      if (apiKeyProblem) {
        toast.error(
          "Invalid Firebase Web API key. Firebase Console → Project settings → your Web app: copy apiKey into NEXT_PUBLIC_FIREBASE_API_KEY. Google Cloud → APIs & Services → Credentials → Browser key: set API restrictions to include Identity Toolkit API (or none for dev); Application restrictions: None or add your site URL.",
        );
      } else if (fb?.code?.startsWith?.("auth/")) {
        const hints: Record<string, string> = {
          "auth/api-key-not-valid":
            "Invalid Firebase Web API key — fix credentials and key restrictions.",
          "auth/invalid-email": "Enter a valid email address.",
          "auth/missing-email": "Enter your email address.",
          "auth/user-not-found":
            "No account for this email. Try signing up or use a different address.",
          "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
          "auth/user-disabled": "This account has been disabled.",
        };
        toast.error(hints[fb.code] ?? `${fb.code}: ${fb.message}`);
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Could not send reset email.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          If an account exists for <strong className="text-foreground">{email.trim().toLowerCase()}</strong>,
          we sent a link to reset your password. Check spam if you don&apos;t see it.
        </p>
        <Link
          href={loginHrefFromSearch(search)}
          className={cn(buttonVariants({ variant: "secondary", size: "default" }), "w-full")}
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

function loginHrefFromSearch(search: Pick<URLSearchParams, "get">): string {
  const invite = search.get("invite")?.trim();
  const next = search.get("next");
  if (!invite) {
    return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  }
  const returnTo = next?.trim() ?? `/invite/${encodeURIComponent(invite)}`;
  return `/login?invite=${encodeURIComponent(invite)}&next=${encodeURIComponent(returnTo)}`;
}

/** Footer link preserving invite + next (matches signup footer behavior). */
export function ForgotPasswordSignInLink() {
  const search = useSearchParams();
  const href = loginHrefFromSearch(search);
  return (
    <p className="text-center text-sm text-muted-foreground">
      Remember your password?{" "}
      <Link href={href} className="font-medium text-link underline underline-offset-4 hover:text-link-hover">
        Sign in
      </Link>
    </p>
  );
}
