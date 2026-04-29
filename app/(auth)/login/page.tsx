import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Suspense } from "react";

export default async function LoginPage(props: {
  searchParams?: Promise<{ next?: string; invite?: string }>;
}) {
  const sp = (await props.searchParams) ?? {};
  const invite = typeof sp.invite === "string" ? sp.invite : undefined;
  const signupHref =
    invite != null
      ? `/signup?invite=${encodeURIComponent(invite)}${typeof sp.next === "string" ? `&next=${encodeURIComponent(sp.next)}` : ""}`
      : "/signup";

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {invite ? "Sign in to continue" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {invite
            ? "Use the invited email account, or create one if you haven't yet."
            : "Sign in to CPIN Capital Management System"}
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link
          href={signupHref}
          className="font-medium text-link underline underline-offset-4 hover:text-link-hover"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
