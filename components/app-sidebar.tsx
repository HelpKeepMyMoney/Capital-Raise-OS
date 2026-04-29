"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { OrgSwitcher } from "@/components/org-switcher";
import {
  LayoutDashboard,
  Users,
  Search,
  Send,
  FolderLock,
  Briefcase,
  CheckSquare,
  BarChart3,
  Settings,
  Sparkles,
  Shield,
} from "lucide-react";
import type { Organization } from "@/lib/firestore/types";
import { isInvestorGuestRole } from "@/lib/auth/rbac";
import { Button } from "@/components/ui/button";

const navRaise = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/investors", label: "Investor CRM", icon: Users },
  { href: "/discovery", label: "Discovery", icon: Search },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/data-room", label: "Data Room", icon: FolderLock },
  { href: "/deals", label: "Deal Room", icon: Briefcase },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const navInvestorGuest = [
  { href: "/deals", label: "Deal room", icon: Briefcase },
  { href: "/data-room", label: "Data room", icon: FolderLock },
];

export function AppSidebar(props: {
  orgs: { org: Organization; role: string }[];
  currentOrgId: string;
  currentRole: string;
  user: { email?: string; name?: string };
  isPlatformAdmin: boolean;
  onOpenCopilot: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const guest = isInvestorGuestRole(props.currentRole);
  const nav = guest ? navInvestorGuest : navRaise;

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar backdrop-blur-xl">
      <SidebarHeader className="gap-3 p-4">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary font-semibold text-sm">
            CP
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight tracking-tight">
              CPIN Capital Management System
            </p>
          </div>
        </div>
        <OrgSwitcher orgs={props.orgs} currentOrgId={props.currentOrgId} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    type="button"
                    isActive={pathname === item.href}
                    onClick={() => router.push(item.href)}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {!guest && props.isPlatformAdmin ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    type="button"
                    isActive={pathname === "/admin" || pathname.startsWith("/admin/")}
                    onClick={() => router.push("/admin")}
                  >
                    <Shield className="size-4" />
                    <span>Admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 gap-2">
        {!guest ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-sidebar-border bg-sidebar-accent/30 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={props.onOpenCopilot}
          >
            <Sparkles className="size-4" />
            AI Copilot
          </Button>
        ) : null}
        <div className="text-xs text-muted-foreground truncate px-1">{props.user.email}</div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
