import { PlatformAdminDashboard } from "@/components/platform-admin/platform-admin-dashboard";

export default function PlatformAdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Platform admin</h1>
        <p className="mt-1 text-foreground/85">
          Manage organizations, Firebase users, and organization memberships. Requires platform admin
          access (see <code className="rounded bg-muted px-1 text-sm">PLATFORM_ADMIN_UIDS</code>).
        </p>
      </div>
      <PlatformAdminDashboard />
    </div>
  );
}
