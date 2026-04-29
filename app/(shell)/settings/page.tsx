import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import {
  canDeleteOrganizationRole,
  canEditOrganizationProfileRole,
} from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { DeleteOrganizationSection } from "@/components/settings/delete-organization-section";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMembership, getOrganization } from "@/lib/firestore/queries";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(membership?.role);
  const org = await getOrganization(ctx.orgId);
  const canEditOrg = membership ? canEditOrganizationProfileRole(membership.role) : false;
  const canDeleteOrg = membership ? canDeleteOrganizationRole(membership.role) : false;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-foreground/85">Organization, branding, integrations, and API keys.</p>
      </div>
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {org ? (
            <OrganizationSettingsForm
              organizationId={org.id}
              initialName={org.name}
              initialSlug={org.slug}
              canEdit={canEditOrg}
            />
          ) : null}
          <Link
            href="/settings/billing"
            className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
          >
            Billing & subscriptions
          </Link>
          {org ? (
            <DeleteOrganizationSection
              organizationId={org.id}
              organizationName={org.name}
              canDelete={canDeleteOrg}
            />
          ) : null}
        </CardContent>
      </Card>
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Configure Resend, OpenAI, Anthropic, PayPal, and GA4/GTM via environment variables on Vercel.</p>
          <p>2FA: enable Firebase MFA in console; toggle UI in a follow-up release.</p>
        </CardContent>
      </Card>
    </div>
  );
}
