import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { canEditOrgData, canEditOrganizationProfileRole } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EsignSettingsClient } from "@/components/settings/esign-settings-client";
import { getMembership, getOrganization } from "@/lib/firestore/queries";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function EsignSettingsPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(membership?.role);
  const canTemplates = membership ? canEditOrgData(membership.role) : false;
  const canSubscription = membership ? canEditOrganizationProfileRole(membership.role) : false;
  const org = await getOrganization(ctx.orgId);

  if (!canTemplates && !canSubscription) {
    redirect("/settings");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/settings" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}>
          ← Settings
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">E-sign templates</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Upload PDFs, place text and date fields for sponsors or investors, and choose which template investors use for
        subscription packets. Data rooms link a template in room settings.
      </p>
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Library & subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <EsignSettingsClient
            organizationId={ctx.orgId}
            canManageTemplates={canTemplates}
            canSetSubscriptionTemplate={canSubscription}
            initialSubscriptionTemplateId={org?.subscriptionSignableTemplateId ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
