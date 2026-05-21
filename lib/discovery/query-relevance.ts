import type { Investor } from "@/lib/firestore/types";
import {
  buildInvestorDiscoveryHaystack,
  getInvestorDiscoverySearchFields,
} from "@/lib/discovery/investor-search-fields";
import {
  parseDiscoveryQuery,
  scoreCheckSizeConstraint,
} from "@/lib/discovery/parse-query-constraints";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "within",
  "last",
  "days",
  "day",
  "active",
  "investor",
  "investors",
  "looking",
  "seeking",
  "find",
  "who",
  "check",
  "size",
  "greater",
  "than",
  "more",
  "over",
  "above",
  "less",
  "under",
  "below",
  "least",
  "most",
  "between",
]);

export type DiscoveryRelevance = {
  score: number;
  reasons: string[];
  matchCount: number;
  matchScore: number;
};

/** Meaningful terms from a natural-language discovery query. */
export function tokenizeDiscoveryQuery(query: string): string[] {
  const withoutMoney = query
    .replace(/\$?\s*[\d,]+(?:\.\d+)?\s*(?:k|m|mm|million|b|billion)?/gi, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .trim();
  if (!withoutMoney) return [];

  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of withoutMoney.split(/\s+/)) {
    const t = raw.replace(/^-+|-+$/g, "");
    if (t.length < 2 || STOP_WORDS.has(t) || seen.has(t)) continue;
    if (/^\d+$/.test(t)) continue;
    seen.add(t);
    tokens.push(t);
  }
  return tokens;
}

export function scoreInvestorForDiscoveryQuery(
  inv: Investor,
  query: string,
): DiscoveryRelevance {
  const trimmed = query.trim();
  const parsed = parseDiscoveryQuery(trimmed);
  const tokens = tokenizeDiscoveryQuery(parsed.textForTokens);
  const skipNumericFields = Boolean(parsed.check);
  const fields = getInvestorDiscoverySearchFields(inv, { skipCheckSizeTextMatch: skipNumericFields });
  const reasons: string[] = ["In your CRM"];

  let matchCount = 0;
  let matchScore = 0;
  const matchedLabels = new Set<string>();

  if (parsed.check) {
    const checkHit = scoreCheckSizeConstraint(inv, parsed.check);
    if (checkHit.matchCount > 0) {
      matchCount += checkHit.matchCount;
      matchScore += checkHit.matchScore;
      for (const r of checkHit.reasons) reasons.push(r);
    }
  }

  if (parsed.textForTokens && tokens.length > 0) {
    for (const token of tokens) {
      let tokenMatched = false;
      for (const field of fields) {
        if (!field.hay || !field.hay.includes(token)) continue;
        tokenMatched = true;
        if (!matchedLabels.has(field.label)) {
          matchedLabels.add(field.label);
          matchScore += field.weight;
          reasons.push(`${field.label} matches "${token}"`);
        }
      }
      if (tokenMatched) matchCount += 1;
    }

    const phraseHay = buildInvestorDiscoveryHaystack(inv, { skipCheckSizeTextMatch: skipNumericFields });
    if (phraseHay.includes(parsed.textForTokens.toLowerCase())) {
      matchScore += 18;
      reasons.push("Phrase match on profile");
    }
  }

  if (parsed.check && matchCount === 0) {
    return {
      score: 5,
      reasons: [...reasons, "Does not meet check size criteria"],
      matchCount: 0,
      matchScore: 0,
    };
  }

  let score: number;
  if (!trimmed) {
    score = 25;
    if (inv.relationshipScore != null) {
      score += Math.min(40, inv.relationshipScore / 2.5);
      reasons.push("Relationship score");
    }
    if (inv.warmCold === "warm") {
      score += 12;
      reasons.push("Warm relationship");
    }
  } else if (matchCount === 0) {
    score = 8;
    reasons.push("No query term overlap");
    if (inv.relationshipScore != null) {
      score += Math.min(8, inv.relationshipScore / 12);
    }
  } else {
    score = 35 + matchCount * 18 + matchScore;
    if (inv.relationshipScore != null) {
      score += Math.min(10, inv.relationshipScore / 10);
      reasons.push("Relationship score");
    }
    if (inv.warmCold === "warm") {
      score += 4;
      reasons.push("Warm relationship");
    }
  }

  if (inv.investProbability != null && inv.investProbability >= 50) {
    score += 3;
  }

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    reasons,
    matchCount,
    matchScore,
  };
}
