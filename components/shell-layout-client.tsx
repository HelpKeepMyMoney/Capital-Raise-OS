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
  user: { email?: string; name?: string };
}) {
  const [copilotOpen, setCopilotOpen] = React.useState(false);

  return (
    <SidebarProvider>
      <AppSidebar
        orgs={props.orgs}
        currentOrgId={props.currentOrgId}
        user={props.user}
        onOpenCopilot={() => setCopilotOpen(true)}
      />
      <SidebarInset className="bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.04_250/0.35),transparent_55%),radial-gradient(ellipse_at_bottom,oklch(0.25_0.05_160/0.2),transparent_50%)]">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-background/40 px-4 backdrop-blur-xl">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
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
