"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";
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
          "w-full justify-between bg-background/50 data-[popup-open]:bg-background/70",
        )}
      >
        <span className="truncate text-left text-sm font-medium">{current.name}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {props.orgs.map(({ org, role }) => (
          <DropdownMenuItem key={org.id} onClick={() => switchOrg(org.id)}>
            <div className="flex flex-col">
              <span className="font-medium">{org.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{role.replace("_", " ")}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
