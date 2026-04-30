import Link from "next/link";
import { cn } from "@/lib/utils";

export const DEFAULT_DEAL_FAQ: { q: string; a: string }[] = [
  {
    q: "How do I invest?",
    a: "Use “Commit capital” or “Express interest” on this page. The sponsor team will follow up with allocation and subscription documents as appropriate.",
  },
  {
    q: "What rights do investors receive?",
    a: "Rights depend on the security type and final legal documents for this offering. Review the data room materials and consult your counsel.",
  },
  {
    q: "Is this accredited investors only?",
    a: "Eligibility is stated in the terms section. Many private offerings are restricted to accredited or qualified investors under applicable law—confirm with the sponsor.",
  },
  {
    q: "What is the timeline to close?",
    a: "See the closing date and status on this page. Deadlines can move based on diligence and document execution.",
  },
  {
    q: "Can entities invest?",
    a: "Typically yes, through a vehicle that meets the sponsor’s subscription requirements—confirm during onboarding.",
  },
  {
    q: "How are updates delivered?",
    a: "Expect updates via email or the investor portal as configured by the sponsor team after you participate.",
  },
];

/** Same logic for deal room and data-room investor preview: custom FAQs when set, else defaults. */
export function resolveDealFaqItems(items?: { q: string; a: string }[]): { q: string; a: string }[] {
  const filtered = items?.filter((f) => f.q?.trim() || f.a?.trim()) ?? [];
  return filtered.length > 0 ? filtered : DEFAULT_DEAL_FAQ;
}

export function FaqSection(props: {
  items?: { q: string; a: string }[];
  /** When set, links to the matching diligence-room FAQ block (same deal’s data room). */
  diligenceRoomFaqHref?: string;
  className?: string;
}) {
  const items = resolveDealFaqItems(props.items);

  return (
    <section id="faq" className={cn("scroll-mt-24 space-y-3", props.className)}>
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">FAQ</h2>
        <p className="mt-1 text-sm text-muted-foreground">Common questions from investors.</p>
        {props.diligenceRoomFaqHref ? (
          <p className="mt-2 text-sm">
            <Link
              href={props.diligenceRoomFaqHref}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              View this FAQ in the diligence room
            </Link>
            <span className="text-muted-foreground"> — for reviewers browsing materials.</span>
          </p>
        ) : null}
      </div>
      <div className="divide-y divide-border/80 rounded-2xl border border-border/80 bg-card">
        {items.map((f, i) => (
          <details key={i} className="group px-4 py-1 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-4 text-left font-medium hover:text-foreground">
              {f.q}
              <span className="text-muted-foreground transition group-open:rotate-180">▼</span>
            </summary>
            <div className="pb-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
