/** Calls the Next.js secured cron route to process outreach queues. */
export async function runOutreachQueue(): Promise<number> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const secret = process.env.CRON_SECRET ?? "";
  const res = await fetch(`${baseUrl}/api/outreach/cron/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });
  if (!res.ok) {
    console.error("[runOutreachQueue] failed", res.status, await res.text());
    return 0;
  }
  const json = (await res.json()) as { processed?: number };
  return json.processed ?? 0;
}
