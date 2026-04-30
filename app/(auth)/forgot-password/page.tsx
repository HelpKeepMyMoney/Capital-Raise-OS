import { Suspense } from "react";
import { ForgotPasswordForm, ForgotPasswordSignInLink } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to choose a new password.
        </p>
      </div>
      <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}>
        <ForgotPasswordForm />
      </Suspense>
      <Suspense fallback={null}>
        <ForgotPasswordSignInLink />
      </Suspense>
    </div>
  );
}
