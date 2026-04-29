"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ValidateJson = {
  organizationName?: string;
  scope?: string;
  dealTitle?: string;
  error?: string;
  emailRequired?: boolean;
  inviteEmail?: string | null;
  expiresAt?: number;
};

export function InviteClient(props: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [validating, setValidating] = React.useState(true);
  const [meta, setMeta] = React.useState<ValidateJson | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = React.useState<string | null>(null);
  const [redeeming, setRedeeming] = React.useState(false);

  React.useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (u) => {
      setUserId(u?.uid ?? null);
      setSessionEmail(u?.email ?? null);
    });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/invitations/validate?token=${encodeURIComponent(props.token)}`,
          { cache: "no-store" },
        );
        const j = (await res.json()) as ValidateJson;
        if (!res.ok) {
          if (!cancelled) setMeta({ error: (j as { error?: string }).error ?? "Invalid invite" });
          return;
        }
        if (!cancelled) setMeta(j);
      } catch {
        if (!cancelled) setMeta({ error: "Could not validate invite" });
      } finally {
        if (!cancelled) {
          setValidating(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.token]);

  const nextEncoded = `/invite/${encodeURIComponent(props.token)}`;

  const locked =
    typeof meta?.inviteEmail === "string" ? meta.inviteEmail.trim().toLowerCase() : "";
  const emailLocked = locked.length > 0;
  const signedInMismatch =
    emailLocked &&
    Boolean(sessionEmail?.trim()) &&
    sessionEmail!.trim().toLowerCase() !== locked;

  async function clearServerSessionAndSignOut() {
    try {
      await firebaseSignOut(getFirebaseAuth());
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign out failed");
    }
  }

  async function redeem() {
    if (signedInMismatch) {
      toast.error("Sign out and sign in with the email this invitation was sent to.");
      return;
    }

    const auth = getFirebaseAuth();
    const u = auth.currentUser;
    if (!u) {
      toast.error("Sign in first.");
      return;
    }
    setRedeeming(true);
    try {
      let idToken = await u.getIdToken();
      const res = await fetch("/api/invitations/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, inviteToken: props.token }),
      });
      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        alreadyMember?: boolean;
        organizationId?: string;
        redirectTo?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Redeem failed");

      await u.getIdToken(true);
      idToken = await u.getIdToken();
      const orgId = data.organizationId;
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          typeof orgId === "string" ? { idToken, organizationId: orgId } : { idToken },
        ),
      });

      toast.success(data.alreadyMember ? "You already have access." : "Welcome — you’re in.");
      router.replace(data.redirectTo ?? "/deals");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Redeem failed");
    } finally {
      setRedeeming(false);
    }
  }

  if (validating || loading) {
    return (
      <div className="mx-auto max-w-md space-y-2 p-8 text-center text-sm opacity-90">
        Loading invitation…
      </div>
    );
  }

  if (meta?.error) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-8 text-center">
        <p className="font-medium text-white">{meta.error}</p>
        <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "inline-flex border-white/40 bg-white/10 text-white hover:bg-white/20")}>
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">You&apos;re invited</h1>
        <p className="text-sm text-white/85">
          {meta?.organizationName ? (
            <>
              Join <strong className="text-white">{meta.organizationName}</strong>
              {meta?.scope === "deal" && meta.dealTitle ? (
                <> to review {meta.dealTitle}</>
              ) : meta?.scope === "org" ? (
                <> investor portal</>
              ) : (
                <>.</>
              )}
            </>
          ) : (
            "Accept your invitation."
          )}
        </p>
        {emailLocked ? (
          <p className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs text-white/95">
            This link is restricted to{" "}
            <span className="font-mono font-medium text-white">{locked}</span>. Sign up or sign in with
            that exact address — or ask the issuer for a link without email lock for testing.
          </p>
        ) : (
          <p className="text-xs text-white/75">Use any Firebase account — this invite is not tied to a specific email.</p>
        )}
      </div>

      {!userId ? (
        <div className="flex flex-col gap-3">
          <Link
            href={`/login?next=${encodeURIComponent(nextEncoded)}&invite=${encodeURIComponent(props.token)}`}
            className={cn(buttonVariants({ variant: "default" }), "inline-flex w-full justify-center")}
          >
            Sign in
          </Link>
          <Link
            href={`/signup?invite=${encodeURIComponent(props.token)}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex w-full justify-center border-white/35 bg-transparent text-white hover:bg-white/10",
            )}
          >
            Create account
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-xs text-white/80">
            Signed in as <span className="font-mono text-white">{sessionEmail ?? "—"}</span>
          </p>
          {signedInMismatch ? (
            <div
              role="alert"
              className="space-y-2 rounded-lg border border-amber-300/60 bg-amber-500/20 px-3 py-2 text-xs text-white"
            >
              <p>
                This invitation was sent to <span className="font-mono font-semibold">{locked}</span>, which
                is not this account.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/40 bg-white/90 text-neutral-900 hover:bg-white"
                  disabled={redeeming}
                  onClick={() => void clearServerSessionAndSignOut()}
                >
                  Sign out
                </Button>
                <Link
                  href={`/login?next=${encodeURIComponent(nextEncoded)}&invite=${encodeURIComponent(props.token)}`}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "border-0 bg-white text-neutral-900 hover:bg-white/90",
                  )}
                >
                  Sign in as {locked}
                </Link>
              </div>
            </div>
          ) : null}
          <Button
            type="button"
            className="w-full bg-white text-neutral-900 hover:bg-white/90"
            disabled={redeeming || signedInMismatch}
            onClick={() => void redeem()}
          >
            {redeeming ? "Joining…" : "Accept invitation"}
          </Button>
          {!signedInMismatch ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-white/90 hover:bg-white/10 hover:text-white"
              disabled={redeeming}
              onClick={() => void clearServerSessionAndSignOut()}
            >
              Use a different Google / email account
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
