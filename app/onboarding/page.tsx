import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { listUserOrganizations } from "@/lib/firestore/queries";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const orgs = await listUserOrganizations(user.uid);
  if (orgs.length) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div
        data-slot="card"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-2xl backdrop-blur-xl space-y-6"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create an organization</h1>
          <p className="text-sm text-muted-foreground">You&apos;re signed in — add your first workspace.</p>
          <p className="text-xs text-muted-foreground">
            Were you invited by a issuer? Use the invitation link from your email to join their workspace instead.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}
