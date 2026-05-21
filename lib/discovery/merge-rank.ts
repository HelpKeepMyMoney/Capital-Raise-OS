import type { Investor } from "@/lib/firestore/types";
import { investorDisplayName } from "@/lib/investors/display-name";
import { parseDiscoveryQuery } from "@/lib/discovery/parse-query-constraints";
import { scoreInvestorForDiscoveryQuery } from "@/lib/discovery/query-relevance";
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

type ScoredCandidate = RankedInvestorCandidate & {
  _matchCount: number;
  _matchScore: number;
};

function crmToCandidate(inv: Investor, query: string): ScoredCandidate {
  const displayName = investorDisplayName(inv);
  const { score, reasons, matchCount, matchScore } = scoreInvestorForDiscoveryQuery(inv, query);
  return {
    id: inv.id,
    name: displayName,
    firm: inv.firm,
    email: inv.email,
    pipelineStage: inv.pipelineStage,
    investorType: inv.investorType,
    location: inv.location,
    sources: ["crm"],
    aiRankScore: score,
    aiRankReasons: reasons,
    _matchCount: matchCount,
    _matchScore: matchScore,
  };
}

function compareDiscoveryCandidates(a: ScoredCandidate, b: ScoredCandidate, hasQuery: boolean): number {
  if (hasQuery) {
    if (a._matchCount !== b._matchCount) return b._matchCount - a._matchCount;
    if (a._matchScore !== b._matchScore) return b._matchScore - a._matchScore;
  }
  return b.aiRankScore - a.aiRankScore;
}

function stripScoringMeta(c: ScoredCandidate): RankedInvestorCandidate {
  const { _matchCount: _mc, _matchScore: _ms, ...rest } = c;
  void _mc;
  void _ms;
  return rest;
}

export async function mergeAndRankDiscovery(
  query: string,
  filters: DiscoveryFilters,
  crm: Investor[],
): Promise<RankedInvestorCandidate[]> {
  const parsed = parseDiscoveryQuery(query);
  const effectiveFilters: DiscoveryFilters = {
    ...filters,
    checkMin: filters.checkMin ?? parsed.check?.min,
    checkMax: filters.checkMax ?? parsed.check?.max,
  };
  const filtered = crm.filter((i) => matchesFilters(i, effectiveFilters));
  const fromCrm = filtered.map((i) => crmToCandidate(i, query));

  const providers = getDiscoveryProviders();
  const enriched: RankedInvestorCandidate[] = [];
  for (const p of providers) {
    const chunk = await p.search(query, filters);
    enriched.push(...chunk);
  }

  const hasQuery = query.trim().length > 0;
  const byId = new Map<string, ScoredCandidate>();
  for (const c of [...enriched.map((e) => ({ ...e, _matchCount: 0, _matchScore: 0 })), ...fromCrm]) {
    const row = c as ScoredCandidate;
    const prev = byId.get(row.id);
    if (!prev) {
      byId.set(row.id, row);
      continue;
    }
    byId.set(row.id, {
      ...prev,
      sources: Array.from(new Set([...prev.sources, ...row.sources])),
      aiRankScore: Math.max(prev.aiRankScore, row.aiRankScore),
      aiRankReasons: Array.from(new Set([...prev.aiRankReasons, ...row.aiRankReasons])),
      _matchCount: Math.max(prev._matchCount, row._matchCount),
      _matchScore: Math.max(prev._matchScore, row._matchScore),
    });
  }

  return Array.from(byId.values())
    .sort((a, b) => compareDiscoveryCandidates(a, b, hasQuery))
    .map(stripScoringMeta);
}
