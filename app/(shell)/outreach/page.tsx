import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/firestore/queries";
import { OutreachClient } from "@/components/outreach-client";
import { redirect } from "next/navigation";

export default async function OutreachPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const m = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(m?.role);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Outreach engine</h1>
        <p className="mt-1 text-foreground/85">
          Sequences, templates, tracking pixels, and reply-aware automation.
        </p>
      </div>
      <OutreachClient />
    </div>
  );
}
