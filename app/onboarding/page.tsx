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
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/70 p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create an organization</h1>
          <p className="text-sm text-muted-foreground">You&apos;re signed in — add your first workspace.</p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}
