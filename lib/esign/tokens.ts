import { createHmac, timingSafeEqual } from "crypto";

export type EsignTokenPayload = {
  e: string;
  r: "sponsor" | "investor" | "lp";
  exp: number;
};

const ALG = "sha256";

function getSecret(): string {
  const s = process.env.ESIGN_TOKEN_SECRET?.trim();
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-esign-secret-min-16-chars!!";
  }
  throw new Error("ESIGN_TOKEN_SECRET must be set (min 16 chars)");
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

export function mintEsignToken(payload: EsignTokenPayload): string {
  const secret = getSecret();
  const body = JSON.stringify(payload);
  const bodyB64 = b64url(Buffer.from(body, "utf8"));
  const sig = createHmac(ALG, secret).update(bodyB64).digest();
  const sigB64 = b64url(sig);
  return `${bodyB64}.${sigB64}`;
}

export function verifyEsignToken(token: string): EsignTokenPayload | null {
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
  let payload: unknown;
  try {
    payload = JSON.parse(b64urlDecode(bodyB64).toString("utf8"));
  } catch {
    return null;
  }
  const p = payload as Partial<EsignTokenPayload>;
  if (typeof p.e !== "string" || !p.e) return null;
  if (p.r !== "sponsor" && p.r !== "investor" && p.r !== "lp") return null;
  if (typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
  return { e: p.e, r: p.r, exp: p.exp };
}
