export function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export function computeProgressPct(raised: number, target: number): number {
  if (target > 0) return Math.min(100, Math.round((raised / target) * 1000) / 10);
  return raised > 0 ? 100 : 0;
}
