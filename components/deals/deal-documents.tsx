"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, HelpCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { RoomDocument } from "@/lib/firestore/types";
import { cn } from "@/lib/utils";
import { trackDealTelemetry } from "@/components/deals/deal-telemetry";

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
  className?: string;
}) {
  const preview = props.documents.slice(0, 5);
  const [summaryPending, setSummaryPending] = React.useState(false);

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

  return (
    <section className={cn("rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:p-8", props.className)}>
      <h2 className="font-heading text-2xl font-bold tracking-tight">Documents &amp; data room</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pitch deck, models, and legal materials.
      </p>
      {preview.length === 0 ?
        <p className="mt-6 text-sm text-muted-foreground">
          Documents will appear here when linked to a data room for this deal.
        </p>
      : <>
          <ul className="mt-6 divide-y divide-border/70 rounded-2xl border border-border/70 bg-muted/20">
            {preview.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <FileText className="size-4 shrink-0 text-blue-600" />
                <span className="min-w-0 flex-1 truncate font-medium">{d.name}</span>
                <span className="shrink-0 rounded-md bg-background px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  {d.kind}
                </span>
              </li>
            ))}
          </ul>
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
              href="#faq"
              className={cn(buttonVariants({ variant: "ghost" }), "inline-flex items-center gap-2 rounded-xl")}
            >
              <HelpCircle className="size-4" />
              Ask questions
            </a>
          </div>
        </>
      }
    </section>
  );
}
