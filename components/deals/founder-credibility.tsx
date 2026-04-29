import type { DealFounder } from "@/lib/firestore/types";
import { cn } from "@/lib/utils";

export function FounderCredibility(props: {
  founder?: DealFounder;
  sponsorProfileFallback?: string;
  className?: string;
}) {
  const f = props.founder;
  const hasFounder = f && (f.name || f.bio || (f.highlights?.length ?? 0) > 0 || f.photoUrl);
  const body =
    hasFounder && (f!.bio || (f!.highlights?.length ?? 0) > 0) ?
      null
      : props.sponsorProfileFallback?.trim();

  if (!hasFounder && !body) return null;

  return (
    <section className={cn("rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:p-8", props.className)}>
      <h2 className="font-heading text-2xl font-bold tracking-tight">Founder &amp; sponsor</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Team credibility and relevant experience.
      </p>
      {hasFounder ? (
        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
          {f!.photoUrl ?
            <div className="mx-auto size-28 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-muted md:mx-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f!.photoUrl}
                alt={f!.name ?? "Founder"}
                className="size-full object-cover"
              />
            </div>
          : null}
          <div className="min-w-0 flex-1 space-y-3">
            {f!.name ? <p className="font-heading text-lg font-semibold">{f!.name}</p> : null}
            {f!.role ? <p className="text-sm font-medium text-muted-foreground">{f!.role}</p> : null}
            {f!.bio ?
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{f!.bio}</p>
            : null}
            {f!.highlights?.length ?
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {f!.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            : null}
          </div>
        </div>
      ) : null}
      {body && !hasFounder ?
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{body}</p>
      : null}
      {body && hasFounder && !f!.bio && !(f!.highlights?.length) ?
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{body}</p>
      : null}
    </section>
  );
}
