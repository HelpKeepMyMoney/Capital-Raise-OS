export function aggregateDealTelemetry(
  events: { event: string; createdAt: number; actorId?: string }[],
): {
  pageViews: number;
  uniqueVisitors: number;
  byEvent: { event: string; count: number }[];
} {
  const pageViews = events.filter((e) => e.event === "page_view");
  const uniqueVisitors = new Set(pageViews.map((e) => e.actorId).filter(Boolean)).size;

  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.event, (counts.get(e.event) ?? 0) + 1);
  }
  const byEvent = [...counts.entries()]
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count);

  return {
    pageViews: pageViews.length,
    uniqueVisitors,
    byEvent,
  };
}
