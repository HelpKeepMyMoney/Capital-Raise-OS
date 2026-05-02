"use client";

import { parseYoutubeVideoId } from "@/lib/youtube/embed";
import { cn } from "@/lib/utils";

export function DealYoutubeSection(props: { url: string; className?: string }) {
  const id = parseYoutubeVideoId(props.url.trim());
  if (!id) return null;

  return (
    <section className={cn("space-y-3", props.className)}>
      <h2 className="font-heading text-2xl font-bold tracking-tight">Overview video</h2>
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border/80 bg-muted/20 shadow-lg">
        <iframe
          title="Deal overview video"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </section>
  );
}
