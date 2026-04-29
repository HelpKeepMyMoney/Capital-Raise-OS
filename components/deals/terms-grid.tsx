import type { ReactNode } from "react";
import { fmtUsd } from "@/lib/deals/format";
import type { Deal, DealType } from "@/lib/firestore/types";
import { Calendar, Globe, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

function typeLabel(t: DealType): string {
  return t.replace(/_/g, " ");
}

export function TermsGrid(props: { deal: Deal; className?: string }) {
  const d = props.deal;
  const items: { label: string; value: ReactNode; icon?: ReactNode }[] = [
    {
      label: "Security type",
      value: <span className="capitalize">{typeLabel(d.type)}</span>,
    },
    ...(d.valuation != null ?
      [{ label: "Valuation", value: fmtUsd(d.valuation) }]
    : []),
    ...(d.minimumInvestment != null ?
      [{ label: "Minimum investment", value: fmtUsd(d.minimumInvestment) }]
    : []),
    ...(d.closeDate != null ?
      [
        {
          label: "Closing date",
          value: new Date(d.closeDate).toLocaleDateString(),
          icon: <Calendar className="size-4" />,
        },
      ]
    : []),
    ...(d.jurisdiction?.trim() ?
      [{ label: "Jurisdiction", value: d.jurisdiction, icon: <Globe className="size-4" /> }]
    : []),
    ...(d.eligibility?.trim() ?
      [{ label: "Investor eligibility", value: d.eligibility, icon: <Shield className="size-4" /> }]
    : []),
  ];

  if (d.terms?.trim()) {
    items.push({ label: "Additional terms", value: d.terms });
  }

  return (
    <section className={cn("space-y-4", props.className)}>
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Economics &amp; terms</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Key structural terms for this offering.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((row, i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
              row.label === "Additional terms" && "sm:col-span-2",
            )}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {row.icon}
              {row.label}
            </div>
            <div className="mt-2 text-sm font-medium leading-snug text-foreground">
              {typeof row.value === "string" ? (
                <span className="whitespace-pre-wrap">{row.value}</span>
              ) : (
                row.value
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
