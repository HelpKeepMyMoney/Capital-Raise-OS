import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/auth/session";
import { mergeAndRankDiscovery } from "@/lib/discovery/merge-rank";
import type { DiscoveryFilters } from "@/lib/discovery/types";
import { listInvestors } from "@/lib/firestore/queries";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getOpenAI } from "@/lib/ai/openai";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = checkRateLimit(rateLimitKey(ip, "discovery"), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json()) as { query?: string; filters?: DiscoveryFilters };
  const query = body.query?.trim() ?? "";
  const filters = body.filters ?? {};
  const investors = await listInvestors(ctx.orgId);
  let ranked = await mergeAndRankDiscovery(query, filters, investors);

  if (process.env.OPENAI_API_KEY && query.length > 2) {
    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_DISCOVERY_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You refine investor match scores. Given a user query and JSON array of candidates with id,name,firm,score, return minified JSON array {id,add} where add is -20..20 score adjustment and one short reason.",
          },
          {
            role: "user",
            content: JSON.stringify({
              query,
              candidates: ranked.slice(0, 25).map((r) => ({
                id: r.id,
                name: r.name,
                firm: r.firm,
                score: r.aiRankScore,
              })),
            }),
          },
        ],
        response_format: { type: "json_object" },
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { adjustments?: { id: string; add: number; reason?: string }[] };
      const adj = new Map((parsed.adjustments ?? []).map((a) => [a.id, a]));
      ranked = ranked.map((r) => {
        const a = adj.get(r.id);
        if (!a) return r;
        const aiRankScore = Math.min(100, Math.max(0, r.aiRankScore + (a.add ?? 0)));
        const aiRankReasons = [...r.aiRankReasons, a.reason ?? "LLM refinement"];
        return { ...r, aiRankScore, aiRankReasons };
      });
      ranked.sort((x, y) => y.aiRankScore - x.aiRankScore);
    } catch {
      /* noop */
    }
  }

  return NextResponse.json({ results: ranked });
}
