import { Suspense } from "react";
import { SignupForm, SignupSignInLink } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}>
        <SignupForm />
      </Suspense>
      <Suspense fallback={null}>
        <SignupSignInLink />
      </Suspense>
    </div>
  );
}
