import { redirect } from "next/navigation";
import { getSessionUser, getActiveOrganizationId } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { listUserOrganizations } from "@/lib/firestore/queries";
import { ShellLayoutClient } from "@/components/shell-layout-client";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const orgs = await listUserOrganizations(user.uid);
  if (orgs.length === 0) redirect("/onboarding");

  const orgId = await getActiveOrganizationId(user);
  if (!orgId) redirect("/onboarding");

  const currentOrg = orgs.find((o) => o.org.id === orgId);
  const currentRole = currentOrg?.role ?? orgs[0]?.role ?? "assistant";

  return (
    <ShellLayoutClient
      orgs={orgs}
      currentOrgId={orgId}
      currentRole={currentRole}
      user={{ email: user.email, name: user.name }}
      isPlatformAdmin={isPlatformAdmin(user)}
    >
      {children}
    </ShellLayoutClient>
  );
}
