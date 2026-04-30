import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import {
  canDeleteOrganizationRole,
  canEditOrganizationProfileRole,
} from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { DeleteOrganizationSection } from "@/components/settings/delete-organization-section";
import { OrganizationContactForm } from "@/components/settings/organization-contact-form";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { SettingsMainPanel } from "@/components/settings/settings-main-panel";
import { UserContactProfileForm } from "@/components/settings/user-contact-profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMembership, getOrganization, getUserDoc } from "@/lib/firestore/queries";
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
  const userDoc = await getUserDoc(ctx.user.uid);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-foreground/85">Organization, branding, integrations, and API keys.</p>
      </div>
      <SettingsMainPanel
        organizationSection={
          <>
            {org ? (
              <OrganizationSettingsForm
                organizationId={org.id}
                initialName={org.name}
                initialSlug={org.slug}
                canEdit={canEditOrg}
              />
            ) : null}
            {org ? (
              <OrganizationContactForm
                organizationId={org.id}
                orgName={org.name}
                orgSlug={org.slug}
                initialContact={org.contact}
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
          </>
        }
        profileSection={
          <UserContactProfileForm
            accountEmail={ctx.user.email ?? userDoc?.email ?? ""}
            initialDisplayName={userDoc?.displayName ?? ctx.user.name}
            initialPhone={userDoc?.phone}
            initialTitle={userDoc?.title}
            initialStreet1={userDoc?.street1}
            initialStreet2={userDoc?.street2}
            initialCity={userDoc?.city}
            initialRegion={userDoc?.region}
            initialPostalCode={userDoc?.postalCode}
            initialCountry={userDoc?.country}
          />
        }
      />
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
