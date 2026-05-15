import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/firestore/queries";
import { SponsorGuideClient } from "@/components/help/sponsor-guide-client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Sponsor Guide",
};

function GuideFallback() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-8 text-sm text-muted-foreground shadow-sm">
      Loading guide…
    </div>
  );
}

export default async function HelpPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(membership?.role);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-8 md:px-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit px-0 text-muted-foreground")}
        >
          ← Dashboard
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Sponsor Guide</h1>
        <p className="max-w-2xl text-sm text-foreground/85">
          How to set up your workspace, run deal and data rooms, manage investors, and use tasks—aligned with the
          CapitalOS navigation for your team.
        </p>
      </div>

      <Suspense fallback={<GuideFallback />}>
        <SponsorGuideClient />
      </Suspense>
    </div>
  );
}
