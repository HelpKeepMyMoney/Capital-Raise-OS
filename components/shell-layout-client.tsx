"use client";

import * as React from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CopilotPanel } from "@/components/copilot-panel";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { Organization } from "@/lib/firestore/types";

export function ShellLayoutClient(props: {
  children: React.ReactNode;
  orgs: { org: Organization; role: string }[];
  currentOrgId: string;
  currentRole: string;
  user: { email?: string; name?: string };
  isPlatformAdmin?: boolean;
}) {
  const [copilotOpen, setCopilotOpen] = React.useState(false);

  return (
    <SidebarProvider>
      <AppSidebar
        orgs={props.orgs}
        currentOrgId={props.currentOrgId}
        currentRole={props.currentRole}
        user={props.user}
        isPlatformAdmin={props.isPlatformAdmin ?? false}
        onOpenCopilot={() => setCopilotOpen(true)}
      />
      <SidebarInset className="bg-background">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/50 px-4 backdrop-blur-xl">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground/80"
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
        <div className="flex-1 p-4 md:p-8">{props.children}</div>
      </SidebarInset>
      <CopilotPanel open={copilotOpen} onOpenChange={setCopilotOpen} />
    </SidebarProvider>
  );
}
