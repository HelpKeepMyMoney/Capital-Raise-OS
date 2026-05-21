export type CheckSizeConstraint = {
  /** Investor must be able to deploy at least this much (uses checkSizeMax, else checkSizeMin). */
  min?: number;
  /** Investor minimum check must not exceed this (uses checkSizeMin, else checkSizeMax). */
  max?: number;
};

export type ParsedDiscoveryQuery = {
  check?: CheckSizeConstraint;
  /** Query text with money / constraint phrases stripped for keyword matching. */
  textForTokens: string;
};

const MONEY =
  "\\$?\\s*([\\d,]+(?:\\.\\d+)?)\\s*(k|m|mm|million|b|billion)?";

function parseAmount(raw: string, suffix?: string): number | null {
  const n = Number.parseFloat(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const s = (suffix ?? "").toLowerCase();
  if (s === "k" || s === "thousand") return n * 1_000;
  if (s === "m" || s === "mm" || s === "million") return n * 1_000_000;
  if (s === "b" || s === "billion") return n * 1_000_000_000;
  return n;
}

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export { formatUsd as formatDiscoveryUsd };

const CHECK_CTX = "(?:check\\s*(?:size)?|ticket|commitment|invest(?:ment)?\\s*amount?)";

const PATTERNS: {
  run: (q: string) => { check: CheckSizeConstraint; span: [number, number] } | null;
}[] = [
  {
    run: (q) => {
      const re = new RegExp(
        `${CHECK_CTX}\\s*(?:is\\s+)?(?:between)\\s*${MONEY}\\s*(?:and|-)\\s*${MONEY}`,
        "i",
      );
      const m = q.match(re);
      if (!m) return null;
      const low = parseAmount(m[1], m[2]);
      const high = parseAmount(m[3], m[4]);
      if (low == null || high == null) return null;
      return { check: { min: Math.min(low, high), max: Math.max(low, high) }, span: [m.index!, m.index! + m[0].length] };
    },
  },
  {
    run: (q) => {
      const re = new RegExp(
        `${CHECK_CTX}\\s*(?:is\\s+)?(?:greater\\s+than|more\\s+than|over|above|at\\s+least|>=?)\\s*${MONEY}`,
        "i",
      );
      const m = q.match(re);
      if (!m) return null;
      const amt = parseAmount(m[1], m[2]);
      if (amt == null) return null;
      return { check: { min: amt }, span: [m.index!, m.index! + m[0].length] };
    },
  },
  {
    run: (q) => {
      const re = new RegExp(
        `${CHECK_CTX}\\s*(?:is\\s+)?(?:less\\s+than|under|below|at\\s+most|<=?)\\s*${MONEY}`,
        "i",
      );
      const m = q.match(re);
      if (!m) return null;
      const amt = parseAmount(m[1], m[2]);
      if (amt == null) return null;
      return { check: { max: amt }, span: [m.index!, m.index! + m[0].length] };
    },
  },
  {
    run: (q) => {
      if (!/\bcheck\b/i.test(q)) return null;
      const re = new RegExp(
        `(?:greater\\s+than|more\\s+than|over|above|at\\s+least|>=?)\\s*${MONEY}`,
        "i",
      );
      const m = q.match(re);
      if (!m) return null;
      const amt = parseAmount(m[1], m[2]);
      if (amt == null) return null;
      return { check: { min: amt }, span: [m.index!, m.index! + m[0].length] };
    },
  },
  {
    run: (q) => {
      if (!/\bcheck\b/i.test(q)) return null;
      const re = new RegExp(`(?:less\\s+than|under|below|at\\s+most|<=?)\\s*${MONEY}`, "i");
      const m = q.match(re);
      if (!m) return null;
      const amt = parseAmount(m[1], m[2]);
      if (amt == null) return null;
      return { check: { max: amt }, span: [m.index!, m.index! + m[0].length] };
    },
  },
];

/** Parse numeric check-size constraints and text safe for keyword tokenization. */
export function parseDiscoveryQuery(query: string): ParsedDiscoveryQuery {
  const trimmed = query.trim();
  if (!trimmed) return { textForTokens: "" };

  for (const { run } of PATTERNS) {
    const hit = run(trimmed);
    if (!hit) continue;
    const before = trimmed.slice(0, hit.span[0]);
    const after = trimmed.slice(hit.span[1]);
    const textForTokens = `${before} ${after}`.replace(/\s+/g, " ").trim();
    return { check: hit.check, textForTokens };
  }

  return { textForTokens: trimmed };
}

/** Whether an investor's check range satisfies parsed min/max (same rules as DiscoveryFilters). */
export function investorMatchesCheckConstraint(
  inv: { checkSizeMin?: number; checkSizeMax?: number },
  check: CheckSizeConstraint,
): boolean {
  if (check.min != null) {
    const high = inv.checkSizeMax ?? inv.checkSizeMin;
    if (high == null || high < check.min) return false;
  }
  if (check.max != null) {
    const low = inv.checkSizeMin ?? inv.checkSizeMax;
    if (low == null || low > check.max) return false;
  }
  return true;
}

export function scoreCheckSizeConstraint(
  inv: { checkSizeMin?: number; checkSizeMax?: number },
  check: CheckSizeConstraint,
): { matchScore: number; matchCount: number; reasons: string[] } {
  if (!investorMatchesCheckConstraint(inv, check)) {
    return { matchScore: 0, matchCount: 0, reasons: [] };
  }

  const low = inv.checkSizeMin;
  const high = inv.checkSizeMax;
  const reasons: string[] = [];
  let matchScore = 28;
  let matchCount = 1;

  if (check.min != null) {
    const ceiling = high ?? low;
    reasons.push(
      ceiling != null
        ? `Check size up to ${formatUsd(ceiling)} (≥ ${formatUsd(check.min)})`
        : `Meets minimum check ${formatUsd(check.min)}`,
    );
    if (ceiling != null && ceiling >= check.min * 5) matchScore += 8;
  }
  if (check.max != null) {
    const floor = low ?? high;
    reasons.push(
      floor != null
        ? `Check size from ${formatUsd(floor)} (≤ ${formatUsd(check.max)} cap)`
        : `Within max check ${formatUsd(check.max)}`,
    );
    matchCount += 1;
  }
  if (low != null && high != null) {
    reasons.push(`Range ${formatUsd(low)}–${formatUsd(high)}`);
  }

  return { matchScore, matchCount, reasons };
}
