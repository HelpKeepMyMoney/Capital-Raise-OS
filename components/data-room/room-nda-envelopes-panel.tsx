"use client";

import * as React from "react";
import { toast } from "sonner";
import { ExternalLink, ArrowDown, ArrowUp } from "lucide-react";
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

function displayInvestorName(row: EnvelopeRow): string {
  return (
    row.investorName ??
    (row.investorEmail.includes("@") ? (row.investorEmail.split("@")[0] ?? row.investorEmail) : row.investorEmail)
  );
}

/** Lower = closer to done (for status column sorting). */
function statusSortRank(status: string): number {
  switch (status) {
    case "completed":
      return 0;
    case "sent":
      return 1;
    case "viewed":
      return 2;
    case "draft":
      return 3;
    case "declined":
    case "error":
      return 4;
    default:
      return 5;
  }
}

function nextSignerSortRank(role: "sponsor" | "investor" | null): number {
  if (role === "investor") return 0;
  if (role === "sponsor") return 1;
  return 2;
}

type SortKey = "investor" | "email" | "status" | "next" | "created";

function SortHead(props: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  return (
    <TableHead className={cn("whitespace-nowrap", props.className)}>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
        onClick={props.onClick}
      >
        {props.label}
        {props.active ? (
          props.dir === "desc" ? (
            <ArrowDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
          ) : (
            <ArrowUp className="size-3.5 shrink-0 opacity-70" aria-hidden />
          )
        ) : null}
      </button>
    </TableHead>
  );
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
  const [sortKey, setSortKey] = React.useState<SortKey>("created");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

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

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created" ? "desc" : "asc");
    }
  }

  const sortedRows = React.useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "investor":
          cmp = displayInvestorName(a).localeCompare(displayInvestorName(b), undefined, { sensitivity: "base" });
          break;
        case "email":
          cmp = a.investorEmail.localeCompare(b.investorEmail, undefined, { sensitivity: "base" });
          break;
        case "status":
          cmp = statusSortRank(a.status) - statusSortRank(b.status);
          if (cmp === 0) cmp = a.status.localeCompare(b.status);
          break;
        case "next":
          cmp = nextSignerSortRank(a.nextSignerRole) - nextSignerSortRank(b.nextSignerRole);
          if (cmp === 0) cmp = nextLabel(a.nextSignerRole).localeCompare(nextLabel(b.nextSignerRole));
          break;
        case "created":
          cmp = a.createdAt - b.createdAt;
          break;
        default:
          cmp = 0;
      }
      if (cmp === 0) cmp = (a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortDir, sortKey]);

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
            variant="default"
            size="sm"
            className="shrink-0 rounded-lg shadow-sm"
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
                  <SortHead
                    label="Investor"
                    active={sortKey === "investor"}
                    dir={sortDir}
                    onClick={() => toggleSort("investor")}
                  />
                  <SortHead
                    label="Email"
                    active={sortKey === "email"}
                    dir={sortDir}
                    onClick={() => toggleSort("email")}
                    className="hidden sm:table-cell"
                  />
                  <SortHead
                    label="Status"
                    active={sortKey === "status"}
                    dir={sortDir}
                    onClick={() => toggleSort("status")}
                  />
                  <SortHead
                    label="Next signer"
                    active={sortKey === "next"}
                    dir={sortDir}
                    onClick={() => toggleSort("next")}
                    className="hidden md:table-cell"
                  />
                  <SortHead
                    label="Created"
                    active={sortKey === "created"}
                    dir={sortDir}
                    onClick={() => toggleSort("created")}
                    className="hidden lg:table-cell"
                  />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[160px] truncate font-medium">
                      {displayInvestorName(row)}
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
                            className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-8 gap-1 rounded-lg text-xs shadow-sm")}
                          >
                            Sponsor
                            <ExternalLink className="size-3 opacity-90" />
                          </a>
                        ) : null}
                        {row.investorSigningUrl ? (
                          <a
                            href={row.investorSigningUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-8 gap-1 rounded-lg text-xs shadow-sm")}
                          >
                            Investor
                            <ExternalLink className="size-3 opacity-90" />
                          </a>
                        ) : null}
                        {row.status === "completed" ? (
                          <a
                            href={`/api/esign/envelopes/${encodeURIComponent(row.id)}/final-document`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-8 gap-1 rounded-lg text-xs shadow-sm")}
                          >
                            PDF
                            <ExternalLink className="size-3 opacity-90" />
                          </a>
                        ) : null}
                        {row.status !== "completed" ? (
                          <>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="h-8 rounded-lg text-xs shadow-sm"
                              onClick={() => void copyUrl("Sponsor", row.sponsorSigningUrl)}
                            >
                              Copy sponsor
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="h-8 rounded-lg text-xs shadow-sm"
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
