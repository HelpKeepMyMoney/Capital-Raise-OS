const bucket = new Map<string, { count: number; resetAt: number }>();

export function rateLimitKey(ip: string, route: string) {
  return `${ip}:${route}`;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const cur = bucket.get(key);
  if (!cur || now > cur.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (cur.count >= limit) {
    return { ok: false, retryAfterMs: cur.resetAt - now };
  }
  cur.count += 1;
  return { ok: true };
}
