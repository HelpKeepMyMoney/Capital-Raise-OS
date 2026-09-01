import type { NextRequest } from "next/server";
import { requireApiKeyAuth, type ApiKeyAuthContext } from "@/lib/api-keys/auth";

export async function withApiKeyAuth(
  req: NextRequest,
  handler: (ctx: ApiKeyAuthContext) => Promise<Response>,
): Promise<Response> {
  const ctx = await requireApiKeyAuth(req);
  if (!ctx) {
    const { v1Unauthorized } = await import("@/lib/api/v1/responses");
    return v1Unauthorized();
  }
  return handler(ctx);
}
