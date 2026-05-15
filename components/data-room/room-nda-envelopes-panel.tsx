"use client";

import * as React from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";

type EnvelopeRow = {
  id: string;
  investorEmail: string;
  investorName: string | null;
  status: string;
  nextSignerRole: "sponsor" | "investor" | null;
  sponsorSigningUrl: string | null;
  investorSigningUrl: string | null;
  createdAt: number;
  updatedAt: number;
};

function statusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "sent":
      return "In progress";
    case "declined":
      return "Declined";
    case "error":
      return "Error";
    case "viewed":
      return "Viewed";
    case "draft":
      return "Draft";
    default:
      return status;
  }
}

function nextLabel(next: "sponsor" | "investor" | null): string {
  if (next === "sponsor") return "Sponsor";
  if (next === "investor") return "Investor";
  return "—";
}

async function copyUrl(label: string, url: string | null) {
  if (!url) {
    toast.message(`No ${label} link on file (it may have expired after signing).`);
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.message(`${label} link copied`);
  } catch {
    toast.error("Could not copy link");
  }
}

type Props = {
  roomId: string;
};

/** Sponsor/staff: lists native data-room NDA envelopes for the selected room with signing + download actions. */
export function RoomNdaEnvelopesPanel(props: Props) {
  const mounted = useMounted();
  const [tick, setTick] = React.useState(0);
  const [rows, setRows] = React.useState<EnvelopeRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/data-room/rooms/${encodeURIComponent(props.roomId)}/nda-envelopes`);
        const json = (await res.json()) as { envelopes?: EnvelopeRow[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not load envelopes");
        if (!cancelled) setRows(json.envelopes ?? []);
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setError(e instanceof Error ? e.message : "Could not load envelopes");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.roomId, tick]);

  return (
    <Card className="rounded-2xl border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">NDA envelopes (this room)</CardTitle>
            <CardDescription className="mt-1.5">
              Mutual NDAs created from this room — including when an investor used{" "}
              <span className="font-medium text-foreground">Request NDA from sponsor</span>. Open signing links while they
              are still active; download the PDF when status is completed.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-lg"
            disabled={loading}
            onClick={() => setTick((t) => t + 1)}
          >
            Refresh list
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <p className="py-6 text-sm text-muted-foreground">Loading envelopes…</p>
        ) : error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No NDA envelopes for this room yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Next signer</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[160px] truncate font-medium">
                      {row.investorName ??
                        (row.investorEmail.includes("@")
                          ? (row.investorEmail.split("@")[0] ?? row.investorEmail)
                          : row.investorEmail)}
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate text-muted-foreground sm:table-cell">
                      {row.investorEmail}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === "completed" ? "default" : "secondary"} className="rounded-full text-[10px]">
                        {statusLabel(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {row.status === "completed" ? "—" : nextLabel(row.nextSignerRole)}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {mounted && row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {row.sponsorSigningUrl ? (
                          <a
                            href={row.sponsorSigningUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1 rounded-lg text-xs")}
                          >
                            Sponsor
                            <ExternalLink className="size-3 opacity-70" />
                          </a>
                        ) : null}
                        {row.investorSigningUrl ? (
                          <a
                            href={row.investorSigningUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1 rounded-lg text-xs")}
                          >
                            Investor
                            <ExternalLink className="size-3 opacity-70" />
                          </a>
                        ) : null}
                        {row.status === "completed" ? (
                          <a
                            href={`/api/esign/envelopes/${encodeURIComponent(row.id)}/final-document`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "h-8 gap-1 rounded-lg text-xs")}
                          >
                            PDF
                            <ExternalLink className="size-3 opacity-70" />
                          </a>
                        ) : null}
                        {row.status !== "completed" ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              onClick={() => void copyUrl("Sponsor", row.sponsorSigningUrl)}
                            >
                              Copy sponsor
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              onClick={() => void copyUrl("Investor", row.investorSigningUrl)}
                            >
                              Copy investor
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
