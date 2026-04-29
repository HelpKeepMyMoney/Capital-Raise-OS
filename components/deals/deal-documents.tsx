"use client";

import Link from "next/link";
import { FileText, HelpCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { RoomDocument } from "@/lib/firestore/types";
import { cn } from "@/lib/utils";
import { trackDealTelemetry } from "@/components/deals/deal-telemetry";

export function DealDocuments(props: {
  dealId: string;
  documents: Pick<RoomDocument, "id" | "name" | "kind" | "dataRoomId">[];
  className?: string;
}) {
  const preview = props.documents.slice(0, 5);

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
              onClick={() => void trackDealTelemetry(props.dealId, "cta_download_summary")}
            >
              Download summary
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
