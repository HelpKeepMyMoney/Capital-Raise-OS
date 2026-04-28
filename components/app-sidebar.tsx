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
} from "lucide-react";
import type { Organization } from "@/lib/firestore/types";
import { Button } from "@/components/ui/button";

const nav = [
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

export function AppSidebar(props: {
  orgs: { org: Organization; role: string }[];
  currentOrgId: string;
  user: { email?: string; name?: string };
  onOpenCopilot: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Sidebar className="border-r border-white/10 bg-sidebar/80 backdrop-blur-xl">
      <SidebarHeader className="gap-3 p-4">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary font-semibold text-sm">
            CP
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">CPIN Raise OS</p>
            <p className="truncate text-xs text-muted-foreground">Capital platform</p>
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 gap-2">
        <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-background/40" onClick={props.onOpenCopilot}>
          <Sparkles className="size-4" />
          AI Copilot
        </Button>
        <div className="text-xs text-muted-foreground truncate px-1">{props.user.email}</div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
