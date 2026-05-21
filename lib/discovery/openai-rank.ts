import { getOpenAI } from "@/lib/ai/openai";
import { serializeInvestorForDiscoveryLlm } from "@/lib/discovery/investor-search-fields";
import type { Investor } from "@/lib/firestore/types";

export type DiscoveryLlmRanking = {
  id: string;
  score: number;
  reason: string;
};

function parseRankingsPayload(raw: string): DiscoveryLlmRanking[] {
  const parsed = JSON.parse(raw) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? ((parsed as { rankings?: unknown; adjustments?: unknown }).rankings ??
        (parsed as { adjustments?: unknown }).adjustments)
      : [];
  if (!Array.isArray(list)) return [];

  return list
    .filter((row): row is { id: string; score: number; reason?: string } => {
      return Boolean(row && typeof row === "object" && "id" in row && "score" in row);
    })
    .map((row) => ({
      id: String(row.id),
      score: Math.min(100, Math.max(0, Math.round(Number(row.score)))),
      reason: typeof row.reason === "string" ? row.reason : "AI match",
    }));
}

/** LLM relevance scores for the full candidate list (when OpenAI is configured). */
export async function rankDiscoveryWithOpenAI(
  query: string,
  investors: Investor[],
): Promise<DiscoveryLlmRanking[] | null> {
  if (!process.env.OPENAI_API_KEY || !query.trim() || investors.length === 0) return null;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_DISCOVERY_MODEL ?? "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          'You rank CRM investors for a capital-raising discovery query. Reply with JSON only: {"rankings":[{"id":"<id>","score":<0-100>,"reason":"<short reason>"}]}. Score every candidate id provided; higher = better fit. Match against all fields in each investor object (contact, firm, sectors, stage, geography, pipeline, notes, check size, warmth, referral, etc.).',
      },
      {
        role: "user",
        content: JSON.stringify({
          query: query.trim(),
          investors: investors.map(serializeInvestorForDiscoveryLlm),
        }),
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return null;
  return parseRankingsPayload(raw);
}
