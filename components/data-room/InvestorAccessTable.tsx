"use client";

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
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

type Props = {
  invitations: InviteRow[];
  selectedDealId?: string;
};

function status(inv: InviteRow, now: number) {
  if (inv.revokedAt) return "Revoked" as const;
  if (inv.acceptedAt) return "Active" as const;
  if (inv.expiresAt < now) return "Expired" as const;
  return "Invited" as const;
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">NDA</TableHead>
            <TableHead className="hidden lg:table-cell">Invited</TableHead>
            <TableHead className="hidden md:table-cell">Access</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                {props.selectedDealId
                  ? "No invitations for this deal yet. Use Invite investor in the header."
                  : "Pick a deal filter in the workspace header to see invitations, or view all below."}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((inv) => (
              <TableRow key={inv.id} className="hover:bg-muted/40">
                <TableCell className="font-medium">{inv.email ?? "— open link"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="rounded-full text-[10px]">
                    {status(inv, now)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-xs text-muted-foreground">— pending model</span>
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                  {formatDistanceToNow(inv.createdAt, { addSuffix: true })}
                </TableCell>
                <TableCell className="hidden text-xs capitalize md:table-cell">{inv.scope}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="ghost" size="sm" className="rounded-lg" disabled title="Coming soon">
                    Resend
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
