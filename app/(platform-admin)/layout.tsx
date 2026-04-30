import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { PlatformAdminHeaderExtras } from "@/components/platform-admin-header";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/50 px-4 backdrop-blur-xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to app
        </Link>
        <div className="flex-1" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Platform admin
        </span>
        <PlatformAdminHeaderExtras />
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
    </div>
  );
}
