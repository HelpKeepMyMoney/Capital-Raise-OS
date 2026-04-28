import type { Investor } from "@/lib/firestore/types";
import type { DiscoveryFilters, RankedInvestorCandidate } from "@/lib/discovery/types";
import { getDiscoveryProviders } from "@/lib/discovery/providers/index";

function matchesFilters(inv: Investor, f: DiscoveryFilters): boolean {
  if (f.investorType && inv.investorType !== f.investorType) return false;
  if (f.geography && inv.location && !inv.location.toLowerCase().includes(f.geography.toLowerCase()))
    return false;
  if (f.sector && inv.preferredSectors?.length) {
    const ok = inv.preferredSectors.some((s) => s.toLowerCase().includes(f.sector!.toLowerCase()));
    if (!ok) return false;
  }
  if (f.stage && inv.stagePreference?.length) {
    const ok = inv.stagePreference.some((s) => s.toLowerCase().includes(f.stage!.toLowerCase()));
    if (!ok) return false;
  }
  if (f.checkMin != null && inv.checkSizeMax != null && inv.checkSizeMax < f.checkMin) return false;
  if (f.checkMax != null && inv.checkSizeMin != null && inv.checkSizeMin > f.checkMax) return false;
  if (f.recencyDays != null && inv.lastContactAt) {
    const cutoff = Date.now() - f.recencyDays * 86400000;
    if (inv.lastContactAt < cutoff) return false;
  }
  return true;
}

function crmToCandidate(inv: Investor, query: string): RankedInvestorCandidate {
  const q = query.toLowerCase();
  let score = 50;
  const reasons: string[] = ["In your CRM"];
  if (inv.name.toLowerCase().includes(q) || inv.firm?.toLowerCase().includes(q)) {
    score += 25;
    reasons.push("Name/firm matches query");
  }
  if (inv.relationshipScore != null) {
    score += Math.min(20, inv.relationshipScore / 5);
    reasons.push("Strong relationship score");
  }
  if (inv.warmCold === "warm") {
    score += 10;
    reasons.push("Warm relationship");
  }
  return {
    id: inv.id,
    name: inv.name,
    firm: inv.firm,
    email: inv.email,
    pipelineStage: inv.pipelineStage,
    investorType: inv.investorType,
    location: inv.location,
    sources: ["crm"],
    aiRankScore: Math.min(100, Math.round(score)),
    aiRankReasons: reasons,
  };
}

export async function mergeAndRankDiscovery(
  query: string,
  filters: DiscoveryFilters,
  crm: Investor[],
): Promise<RankedInvestorCandidate[]> {
  const filtered = crm.filter((i) => matchesFilters(i, filters));
  const fromCrm = filtered.map((i) => crmToCandidate(i, query));

  const providers = getDiscoveryProviders();
  const enriched: RankedInvestorCandidate[] = [];
  for (const p of providers) {
    const chunk = await p.search(query, filters);
    enriched.push(...chunk);
  }

  const byId = new Map<string, RankedInvestorCandidate>();
  for (const c of [...enriched, ...fromCrm]) {
    const prev = byId.get(c.id);
    if (!prev) {
      byId.set(c.id, c);
      continue;
    }
    byId.set(c.id, {
      ...prev,
      sources: Array.from(new Set([...prev.sources, ...c.sources])),
      aiRankScore: Math.max(prev.aiRankScore, c.aiRankScore),
      aiRankReasons: Array.from(new Set([...prev.aiRankReasons, ...c.aiRankReasons])),
    });
  }

  return Array.from(byId.values()).sort((a, b) => b.aiRankScore - a.aiRankScore);
}
