/** POST investor “request NDA” — notifies sponsor org inboxes when Resend is configured. */
export async function postInvestorNdaRequest(
  roomId: string,
): Promise<
  | {
      ok: true;
      emailed: boolean;
      envelopeCreated: boolean;
      envelopeError?: string;
      investorSigningUrl?: string | null;
      sponsorSigningUrl?: string | null;
    }
  | { ok: false; error: string }
> {
  const res = await fetch(`/api/data-room/rooms/${encodeURIComponent(roomId)}/nda-investor-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  let json: {
    error?: string;
    emailed?: boolean;
    envelopeCreated?: boolean;
    envelopeError?: string;
    investorSigningUrl?: string | null;
    sponsorSigningUrl?: string | null;
  } = {};
  try {
    json = (await res.json()) as typeof json;
  } catch {
    return { ok: false, error: res.ok ? "Invalid response" : "Request failed" };
  }
  if (!res.ok) return { ok: false, error: typeof json.error === "string" ? json.error : "Request failed" };
  return {
    ok: true,
    emailed: Boolean(json.emailed),
    envelopeCreated: Boolean(json.envelopeCreated),
    envelopeError: typeof json.envelopeError === "string" ? json.envelopeError : undefined,
    investorSigningUrl: json.investorSigningUrl ?? null,
    sponsorSigningUrl: json.sponsorSigningUrl ?? null,
  };
}
