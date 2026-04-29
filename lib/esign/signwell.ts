/** SignWell REST API (server-only). See https://developers.signwell.com/ */

const BASE = "https://www.signwell.com/api/v1";

export async function signwellRequest(path: string, init?: RequestInit): Promise<Response> {
  const key = process.env.SIGNWELL_API_KEY;
  if (!key) throw new Error("SIGNWELL_API_KEY is not configured");
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": key,
      ...init?.headers,
    },
  });
}
