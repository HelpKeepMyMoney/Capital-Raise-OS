"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, HelpCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RoomDocument } from "@/lib/firestore/types";
import { cn } from "@/lib/utils";
import { trackDealTelemetry } from "@/components/deals/deal-telemetry";
import { pickInvestorSpotlightDocuments } from "@/components/data-room/investor-spotlight-docs";

function pickSummaryDocument(
  docs: Pick<RoomDocument, "id" | "name" | "kind" | "dataRoomId">[],
): Pick<RoomDocument, "id" | "name" | "kind" | "dataRoomId"> | null {
  if (docs.length === 0) return null;
  const sorted = [...docs].sort((a, b) => a.name.localeCompare(b.name));
  const bySummaryName = sorted.find((d) =>
    /summary|one[- ]pager|fact\s*sheet|teaser|investor\s+overview/i.test(d.name),
  );
  if (bySummaryName) return bySummaryName;
  const deck = sorted.find((d) => d.kind === "deck");
  if (deck) return deck;
  const pdf = sorted.find((d) => d.name.toLowerCase().endsWith(".pdf"));
  if (pdf) return pdf;
  return sorted[0] ?? null;
}

export function DealDocuments(props: {
  dealId: string;
  documents: Pick<RoomDocument, "id" | "name" | "kind" | "dataRoomId">[];
  /** When set (e.g. linked data room exists), “Ask questions” jumps to that room’s FAQ; else in-page #faq. */
  faqHref?: string;
  className?: string;
  /** When true, omit the whole section if there are no linked documents to list. */
  hideWhenNoDocuments?: boolean;
}) {
  const faqHref = props.faqHref ?? "#faq";
  const fileDocs = React.useMemo(
    () => props.documents.filter((d) => d.kind !== "folder"),
    [props.documents],
  );
  const spotlightRows = React.useMemo(
    () => pickInvestorSpotlightDocuments(props.documents),
    [props.documents],
  );
  const [summaryPending, setSummaryPending] = React.useState(false);

  if (props.hideWhenNoDocuments && fileDocs.length === 0) return null;

  async function downloadSummary() {
    void trackDealTelemetry(props.dealId, "cta_download_summary");
    const target = pickSummaryDocument(props.documents);
    if (!target) {
      toast.error("No documents are available to download yet.");
      return;
    }
    setSummaryPending(true);
    // Avoid noopener on this first open — with noopener many browsers return null, which forced same-tab navigation.
    const popup = window.open("about:blank", "_blank");
    try {
      const res = await fetch("/api/data-room/sign-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: target.id }),
      });
      const data = (await res.json()) as { url?: string; error?: string; name?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not generate download link");

      if (popup && !popup.closed) {
        popup.location.href = data.url;
      } else {
        const tab = window.open(data.url, "_blank");
        if (!tab) {
          toast.error("Could not open a new tab", {
            description: "Allow pop-ups for this site, or use View documents to open the file.",
          });
          return;
        }
      }
      toast.message(`Opening “${data.name ?? target.name}”`);
    } catch (e) {
      popup?.close();
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setSummaryPending(false);
    }
  }

  const actionBar = (
    <div className="mt-6 flex flex-wrap gap-2">
      <Link
        href={`/data-room?deal=${encodeURIComponent(props.dealId)}`}
        className={cn(buttonVariants(), "rounded-xl")}
        onClick={() => void trackDealTelemetry(props.dealId, "cta_view_documents")}
      >
        View documents
      </Link>
      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        disabled={summaryPending}
        onClick={() => void downloadSummary()}
      >
        {summaryPending ? "Preparing…" : "Download summary"}
      </Button>
      <a
        href={faqHref}
        className={cn(buttonVariants({ variant: "ghost" }), "inline-flex items-center gap-2 rounded-xl")}
      >
        <HelpCircle className="size-4" />
        Ask questions
      </a>
    </div>
  );

  return (
    <section className={cn("rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:p-8", props.className)}>
      <h2 className="font-heading text-2xl font-bold tracking-tight">Documents &amp; data room</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pitch deck, models, and legal materials.
      </p>
      {spotlightRows.length > 0 ? (
        <>
          <ul className="mt-6 divide-y divide-border/70 rounded-2xl border border-border/70 bg-muted/20">
            {spotlightRows.map(({ doc: d, label }) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <FileText className="size-4 shrink-0 text-blue-600" aria-hidden />
                <a
                  href={`/api/data-room/documents/${encodeURIComponent(d.id)}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate font-medium text-primary hover:underline"
                >
                  {d.name}
                </a>
                <Badge variant="secondary" className="shrink-0">
                  {label}
                </Badge>
              </li>
            ))}
          </ul>
          {actionBar}
        </>
      ) : fileDocs.length > 0 ? (
        <>
          <p className="mt-6 text-sm text-muted-foreground">
            No pitch deck, PPM, term sheet, financial projections, or articles-style file matched yet. Use View
            documents for the full library.
          </p>
          {actionBar}
        </>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Documents will appear here when linked to a data room for this deal.
        </p>
      )}
    </section>
  );
}
