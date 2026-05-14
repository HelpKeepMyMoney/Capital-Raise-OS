/** POST investor “request NDA” — notifies sponsor org inboxes when Resend is configured. */
export async function postInvestorNdaRequest(
  roomId: string,
): Promise<{ ok: true; emailed: boolean } | { ok: false; error: string }> {
  const res = await fetch(`/api/data-room/rooms/${encodeURIComponent(roomId)}/nda-investor-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const json = (await res.json()) as { error?: string; emailed?: boolean };
  if (!res.ok) return { ok: false, error: typeof json.error === "string" ? json.error : "Request failed" };
  return { ok: true, emailed: Boolean(json.emailed) };
}
