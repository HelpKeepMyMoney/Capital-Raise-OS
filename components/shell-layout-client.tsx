"use client";

import * as React from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CopilotPanel } from "@/components/copilot-panel";
import { CopilotUIProvider } from "@/components/copilot-ui-context";
import { ShellCommandPalette } from "@/components/shell-command-palette";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { Organization, SubscriptionPlan } from "@/lib/firestore/types";
import { canUseAiCopilot, effectivePlan } from "@/lib/billing/features";
import { usePathname } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { isInvestorGuestRole } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils";

const MODULE_LABELS: { prefix: string; label: string }[] = [
  { prefix: "/dashboard", label: "Command center" },
  { prefix: "/investors", label: "Investor CRM" },
  { prefix: "/discovery", label: "Discovery" },
  { prefix: "/outreach", label: "Outreach" },
  { prefix: "/data-room", label: "Data room" },
  { prefix: "/deals", label: "Deal room" },
  { prefix: "/tasks", label: "Tasks" },
  { prefix: "/analytics", label: "Analytics" },
  { prefix: "/settings", label: "Settings" },
  { prefix: "/portal", label: "LP portal" },
  { prefix: "/admin", label: "Platform admin" },
];

function moduleLabelForPath(pathname: string): string {
  const hit = MODULE_LABELS.find(
    (m) => pathname === m.prefix || pathname.startsWith(`${m.prefix}/`),
  );
  return hit?.label ?? "CPIN";
}

export function ShellLayoutClient(props: {
  children: React.ReactNode;
  orgs: { org: Organization; role: string }[];
  currentOrgId: string;
  currentOrgName: string;
  subscriptionPlan?: SubscriptionPlan;
  currentRole: string;
  user: { email?: string; name?: string };
  isPlatformAdmin?: boolean;
}) {
  const [copilotOpen, setCopilotOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const pathname = usePathname();
  const guest = isInvestorGuestRole(props.currentRole);
  const moduleLabel = moduleLabelForPath(pathname);
  const aiCopilotEnabled = canUseAiCopilot(effectivePlan(props.subscriptionPlan));

  const openCopilot = React.useCallback(() => setCopilotOpen(true), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (guest) return;
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((v) => !v);
        return;
      }
      if (e.key === "/") {
        const t = e.target as HTMLElement | null;
        if (
          t?.tagName === "INPUT" ||
          t?.tagName === "TEXTAREA" ||
          t?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [guest]);

  return (
    <SidebarProvider>
      <AppSidebar
        orgs={props.orgs}
        currentOrgId={props.currentOrgId}
        currentRole={props.currentRole}
        user={props.user}
        isPlatformAdmin={props.isPlatformAdmin ?? false}
        onOpenCopilot={openCopilot}
        aiCopilotEnabled={aiCopilotEnabled}
      />
      <CopilotUIProvider openCopilot={openCopilot}>
        <SidebarInset className="bg-[#f8fafc] dark:bg-muted/40">
          <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card/80 px-4 py-2 shadow-sm backdrop-blur-sm md:px-6">
            <SidebarTrigger className="-ml-1 text-foreground" />
            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <div className="hidden min-w-0 flex-1 flex-col gap-0.5 sm:flex md:max-w-md">
              <p className="truncate font-heading text-sm font-semibold tracking-tight text-foreground">
                {props.currentOrgName || "Organization"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{moduleLabel}</p>
            </div>
            <div className="relative order-3 w-full sm:order-none sm:mx-auto sm:max-w-sm md:max-w-md">
              {guest ? (
                <>
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <div
                    className="flex h-9 w-full items-center rounded-xl border border-border/80 bg-background/90 pl-9 pr-3 text-sm text-muted-foreground shadow-sm"
                    aria-hidden
                  >
                    Search deals & documents (soon)
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCommandOpen(true)}
                    className={cn(
                      "relative flex h-9 w-full items-center gap-2 rounded-xl border border-border/80 bg-background/90 pl-9 pr-3 text-left text-sm shadow-sm transition-colors hover:border-border hover:bg-background",
                    )}
                  >
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <span className="flex-1 truncate text-muted-foreground">
                      Search investors, deals, tasks, or run actions…
                    </span>
                    <kbd className="pointer-events-none hidden shrink-0 rounded-lg border border-border/80 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline">
                      ⌘K
                    </kbd>
                  </button>
                  <ShellCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
                </>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
              >
                Log out
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <div className="flex-1 p-6 md:p-10">{props.children}</div>
        </SidebarInset>
        {!guest ? (
          <Button
            type="button"
            size="icon"
            aria-label="Open AI Copilot"
            onClick={() => setCopilotOpen(true)}
            className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full border border-primary/25 bg-card text-primary shadow-lg shadow-primary/10 transition-transform hover:scale-[1.03] hover:bg-card"
          >
            <Sparkles className="size-5" />
          </Button>
        ) : null}
        <CopilotPanel
          open={copilotOpen}
          onOpenChange={setCopilotOpen}
          copilotEnabled={aiCopilotEnabled}
        />
      </CopilotUIProvider>
    </SidebarProvider>
  );
}
