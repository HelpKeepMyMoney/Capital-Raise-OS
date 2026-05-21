"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OutreachRecipient } from "@/lib/firestore/types";

export function RecipientTable(props: {
  recipients: (OutreachRecipient & { investorName?: string })[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Investor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Step</TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead>Opened</TableHead>
            <TableHead>Clicked</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.recipients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                No recipients yet. Add investors in Investor CRM, save audience rules on the
                campaign, then launch to enroll matching contacts.
              </TableCell>
            </TableRow>
          ) : (
            props.recipients.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.investorName ?? r.investorId}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums">{r.currentStepIndex + 1}</TableCell>
                <TableCell className="tabular-nums">{r.engagementScore}</TableCell>
                <TableCell>{r.opened ? "Yes" : "—"}</TableCell>
                <TableCell>{r.clicked ? "Yes" : "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
