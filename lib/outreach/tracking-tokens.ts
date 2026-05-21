import { createHmac, timingSafeEqual } from "crypto";

export type OutreachTrackingPayload = {
  touchId: string;
  exp: number;
  /** Present for click tokens — original URL to redirect to */
  url?: string;
};

const ALG = "sha256";

function getSecret(): string {
  const s =
    process.env.OUTREACH_TRACKING_SECRET?.trim() ??
    process.env.ESIGN_TOKEN_SECRET?.trim();
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-outreach-tracking-secret!!";
  }
  throw new Error("OUTREACH_TRACKING_SECRET must be set (min 16 chars)");
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = 4 - (s.length % 4 || 4);
  const b64 = (s + "=".repeat(pad === 4 ? 0 : pad)).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

export function mintOutreachTrackingToken(
  payload: OutreachTrackingPayload,
  ttlMs = 90 * 86400000,
): string {
  const secret = getSecret();
  const body = JSON.stringify({ ...payload, exp: payload.exp ?? Date.now() + ttlMs });
  const bodyB64 = b64url(Buffer.from(body, "utf8"));
  const sig = createHmac(ALG, secret).update(bodyB64).digest();
  return `${bodyB64}.${b64url(sig)}`;
}

export function verifyOutreachTrackingToken(token: string): OutreachTrackingPayload | null {
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [bodyB64, sigB64] = parts;
  if (!bodyB64 || !sigB64) return null;
  const expected = createHmac(ALG, secret).update(bodyB64).digest();
  let sig: Buffer;
  try {
    sig = b64urlDecode(sigB64);
  } catch {
    return null;
  }
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(bodyB64).toString("utf8")) as OutreachTrackingPayload;
    if (!payload.touchId || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
