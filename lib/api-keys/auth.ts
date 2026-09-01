import type { NextRequest } from "next/server";
import { resolveOrgApiKeyFromSecret } from "@/lib/api-keys/queries";
import { isOrgApiKeyFormat } from "@/lib/api-keys/token";

export type ApiKeyAuthContext = {
  orgId: string;
  apiKeyId: string;
  /** Audit log actor id for API-key-authenticated writes. */
  actorId: string;
};

export function extractApiKeyFromRequest(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  const xKey = req.headers.get("x-api-key");
  if (xKey?.trim()) return xKey.trim();
  return null;
}

export async function requireApiKeyAuth(req: NextRequest): Promise<ApiKeyAuthContext | null> {
  const raw = extractApiKeyFromRequest(req);
  if (!raw || !isOrgApiKeyFormat(raw)) return null;
  const resolved = await resolveOrgApiKeyFromSecret(raw);
  if (!resolved) return null;
  return {
    orgId: resolved.organizationId,
    apiKeyId: resolved.keyId,
    actorId: `api_key:${resolved.keyId}`,
  };
}
