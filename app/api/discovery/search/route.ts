import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/auth/session";
import { rankDiscoveryWithOpenAI } from "@/lib/discovery/openai-rank";
import { mergeAndRankDiscovery } from "@/lib/discovery/merge-rank";
import type { DiscoveryFilters } from "@/lib/discovery/types";
import { listInvestors } from "@/lib/firestore/queries";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = checkRateLimit(rateLimitKey(ip, "discovery"), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { query?: string; filters?: DiscoveryFilters };
  try {
    body = (await req.json()) as { query?: string; filters?: DiscoveryFilters };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  const filters = body.filters ?? {};
  const investors = await listInvestors(ctx.orgId);
  const investorById = new Map(investors.map((i) => [i.id, i]));
  let ranked = await mergeAndRankDiscovery(query, filters, investors);

  if (query.length > 0) {
    try {
      const llmInvestors = ranked
        .map((r) => investorById.get(r.id))
        .filter((inv): inv is NonNullable<typeof inv> => inv != null);
      const llmRankings = await rankDiscoveryWithOpenAI(query, llmInvestors);
      if (llmRankings?.length) {
        const byId = new Map(llmRankings.map((r) => [r.id, r]));
        ranked = ranked
          .map((r) => {
            const hit = byId.get(r.id);
            if (!hit) return r;
            return {
              ...r,
              aiRankScore: hit.score,
              aiRankReasons: [`AI: ${hit.reason}`, ...r.aiRankReasons],
            };
          })
          .sort((a, b) => b.aiRankScore - a.aiRankScore);
      }
    } catch {
      /* keep heuristic ranking */
    }
  }

  return NextResponse.json(
    { queryUsed: query, results: ranked },
    { headers: { "Cache-Control": "no-store" } },
  );
}
