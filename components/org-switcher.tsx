"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";
import { formatOrganizationRole } from "@/lib/auth/rbac";
import type { Organization } from "@/lib/firestore/types";

export function OrgSwitcher(props: {
  orgs: { org: Organization; role: string }[];
  currentOrgId: string;
}) {
  const router = useRouter();
  const current = props.orgs.find((o) => o.org.id === props.currentOrgId)?.org ?? props.orgs[0]?.org;

  async function switchOrg(organizationId: string) {
    await fetch("/api/auth/active-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId }),
    });
    router.refresh();
  }

  if (!current) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full justify-between border-sidebar-border bg-sidebar-accent/25 text-sidebar-foreground data-[popup-open]:bg-sidebar-accent/40",
        )}
      >
        <span className="truncate text-left text-sm font-medium text-sidebar-foreground">{current.name}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {props.orgs.map(({ org, role }) => (
            <DropdownMenuItem key={org.id} onClick={() => switchOrg(org.id)}>
              <div className="flex flex-col">
                <span className="font-medium">{org.name}</span>
                <span className="text-xs text-muted-foreground">{formatOrganizationRole(role)}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
