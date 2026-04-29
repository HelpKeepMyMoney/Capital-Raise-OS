"use client";

import * as React from "react";
import type { InviteRow } from "@/lib/data-room/server-queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  invitations: InviteRow[];
  selectedDealId?: string;
};

function inviteStatus(inv: InviteRow, now: number) {
  if (inv.revokedAt) return "Revoked" as const;
  if (inv.acceptedAt) return "Accepted" as const;
  if (inv.expiresAt < now) return "Expired" as const;
  return "Invited" as const;
}

function displayName(inv: InviteRow): string {
  if (inv.email) {
    const local = inv.email.split("@")[0] ?? inv.email;
    return local.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Open link";
}

export function InvestorAccessTable(props: Props) {
  const now = Date.now();
  let rows = props.invitations;
  if (props.selectedDealId) {
    rows = rows.filter(
      (inv) => inv.scope === "deal" && inv.dealIds.includes(props.selectedDealId!),
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <Table zebra>
        <TableHeader>
          <TableRow>
            <TableHead>Investor</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead>Invite status</TableHead>
            <TableHead className="hidden md:table-cell">NDA status</TableHead>
            <TableHead className="hidden lg:table-cell">Last seen</TableHead>
            <TableHead className="hidden xl:table-cell">Docs viewed</TableHead>
            <TableHead className="hidden xl:table-cell">Commitment</TableHead>
            <TableHead className="hidden lg:table-cell">Stage</TableHead>
            <TableHead className="hidden 2xl:table-cell">Owner</TableHead>
            <TableHead className="w-[52px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                {props.selectedDealId
                  ? "No invitations for this deal yet. Use Invite investor in the header."
                  : "Pick a deal filter to narrow invitations, or review all rows below."}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((inv) => {
              const st = inviteStatus(inv, now);
              return (
                <TableRow key={inv.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{displayName(inv)}</TableCell>
                  <TableCell className="hidden max-w-[200px] truncate text-muted-foreground sm:table-cell">
                    {inv.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={st === "Accepted" ? "default" : "secondary"}
                      className="rounded-full text-[10px] capitalize"
                    >
                      {st}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    —
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    —
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                    —
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                    —
                  </TableCell>
                  <TableCell className="hidden text-xs capitalize text-muted-foreground lg:table-cell">
                    {st === "Accepted" ? "Active" : "Invite"}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground 2xl:table-cell">
                    —
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:bg-muted",
                        )}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-xl">
                        <DropdownMenuItem onClick={() => toast.message("Resend invite — connect email provider to enable.")}>
                          Resend invite
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>Send message</DropdownMenuItem>
                        <DropdownMenuItem disabled>Mark warm</DropdownMenuItem>
                        <DropdownMenuItem disabled>Assign owner</DropdownMenuItem>
                        <DropdownMenuItem disabled>Move to Docs sent</DropdownMenuItem>
                        <DropdownMenuItem disabled>Move to Committed</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
        Showing {rows.length} invitation{rows.length === 1 ? "" : "s"}
        {props.selectedDealId ? " for the selected deal" : ""}. CRM-linked metrics (last seen, docs, commitment)
        appear when guest accounts merge with investor records.
      </p>
    </div>
  );
}
