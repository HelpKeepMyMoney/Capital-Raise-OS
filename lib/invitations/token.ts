import { createHash, randomBytes } from "crypto";

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(raw: string): string {
  return createHash("sha256").update(raw.trim(), "utf8").digest("hex");
}
