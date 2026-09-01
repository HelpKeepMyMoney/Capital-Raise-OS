import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { canEditOrganizationProfileRole } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { ApiKeysSection } from "@/components/settings/api-keys-section";
import { getMembership, getOrganization } from "@/lib/firestore/queries";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function SettingsApiKeysPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(membership?.role);
  const org = await getOrganization(ctx.orgId);
  if (!org) redirect("/settings");

  const canManage = membership ? canEditOrganizationProfileRole(membership.role) : false;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/settings" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}>
          ← Settings
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">REST API keys</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Create an org-scoped key, copy it once, then call <code className="text-xs">/api/v1</code> to read and update
        deals, investors, data rooms, and tasks without using the website. Only founders and admins can mint or revoke
        keys.
      </p>
      <ApiKeysSection organizationId={org.id} canManage={canManage} />
    </div>
  );
}
