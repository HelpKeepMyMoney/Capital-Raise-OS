"use client";

import * as React from "react";
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
  Building2,
  Wallet,
} from "lucide-react";
import type { Organization } from "@/lib/firestore/types";
import { isInvestorGuestRole } from "@/lib/auth/rbac";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const raiseNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/discovery", label: "Discovery", icon: Search },
  { href: "/outreach", label: "Outreach", icon: Send },
];

const capitalNav: NavItem[] = [
  { href: "/investors", label: "Investor CRM", icon: Users },
  { href: "/deals", label: "Deal Room", icon: Briefcase },
  { href: "/data-room", label: "Data Room", icon: FolderLock },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

const insightsNav: NavItem[] = [{ href: "/analytics", label: "Analytics", icon: BarChart3 }];

const systemNav: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];

const navInvestorGuest: NavItem[] = [
  { href: "/portal", label: "Portal home", icon: Building2 },
  { href: "/portal/commitments", label: "Commitments", icon: Wallet },
  { href: "/deals", label: "Deal room", icon: Briefcase },
  { href: "/data-room", label: "Data room", icon: FolderLock },
];

function NavGroupBlock(props: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <SidebarGroup className="gap-1">
      <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/55">
        {props.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {props.items.map((item) => {
            const active = isNavItemActive(props.pathname, item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  type="button"
                  isActive={active}
                  onClick={() => props.onNavigate(item.href)}
                  className={
                    active
                      ? "border-l-2 border-sidebar-primary bg-sidebar-accent/80 font-medium text-sidebar-foreground"
                      : "text-sidebar-foreground/90"
                  }
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar(props: {
  orgs: { org: Organization; role: string }[];
  currentOrgId: string;
  currentRole: string;
  user: { email?: string; name?: string };
  isPlatformAdmin: boolean;
  onOpenCopilot: () => void;
  aiCopilotEnabled: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const guest = isInvestorGuestRole(props.currentRole);

  const navigate = (href: string) => router.push(href);

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl">
      <SidebarHeader className="gap-3 border-b border-sidebar-border/60 p-4">
        <div className="flex items-center gap-3 px-0.5">
          <Link
            href={guest ? "/portal" : "/dashboard"}
            className="flex h-10 max-w-[148px] shrink-0 items-center overflow-hidden rounded-xl ring-1 ring-sidebar-primary/25 ring-offset-2 ring-offset-sidebar"
            aria-label="CPIN home"
          >
            {/* Native img: reliable for /public assets; logo has dark bg — ring offsets it from the sidebar */}
            <img
              src="/cpin-logo.jpg"
              alt=""
              width={148}
              height={40}
              className="h-10 w-auto max-w-[148px] object-contain object-left"
              decoding="async"
              fetchPriority="high"
            />
          </Link>
          <div className="min-w-0">
            <p className="font-heading text-sm font-semibold leading-tight tracking-tight">CPIN</p>
            <p className="mt-0.5 truncate text-[11px] leading-snug text-sidebar-foreground/65">
              Operating system for private capital
            </p>
          </div>
        </div>
        <OrgSwitcher orgs={props.orgs} currentOrgId={props.currentOrgId} />
      </SidebarHeader>
      <SidebarContent className="gap-0 px-2 py-3">
        {guest ? (
          <NavGroupBlock label="LP portal" items={navInvestorGuest} pathname={pathname} onNavigate={navigate} />
        ) : (
          <>
            <NavGroupBlock label="Raise" items={raiseNav} pathname={pathname} onNavigate={navigate} />
            <NavGroupBlock label="Capital" items={capitalNav} pathname={pathname} onNavigate={navigate} />
            <NavGroupBlock label="Insights" items={insightsNav} pathname={pathname} onNavigate={navigate} />
            <NavGroupBlock label="System" items={systemNav} pathname={pathname} onNavigate={navigate} />
            {!guest && props.isPlatformAdmin ? (
              <SidebarGroup className="gap-1">
                <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/55">
                  Admin
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        type="button"
                        isActive={isNavItemActive(pathname, "/admin")}
                        onClick={() => navigate("/admin")}
                        className={
                          isNavItemActive(pathname, "/admin")
                            ? "border-l-2 border-sidebar-primary bg-sidebar-accent/80 font-medium"
                            : ""
                        }
                      >
                        <Shield className="size-4" />
                        <span>Platform admin</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="gap-2 border-t border-sidebar-border/60 p-3">
        {!guest ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 rounded-xl border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground shadow-sm hover:bg-sidebar-accent"
            onClick={props.onOpenCopilot}
          >
            <Sparkles className="size-4 text-sidebar-primary" />
            <span className="flex-1 text-left">AI Copilot</span>
            {!props.aiCopilotEnabled ? (
              <span className="rounded-md bg-sidebar-primary/25 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-sidebar-primary">
                Pro+
              </span>
            ) : null}
          </Button>
        ) : null}
        <p className="text-[10px] leading-relaxed text-sidebar-foreground/45">
          Syndications · funds · community wealth · SPVs
        </p>
        <div className="truncate px-0.5 text-xs text-sidebar-foreground/70">{props.user.email}</div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
