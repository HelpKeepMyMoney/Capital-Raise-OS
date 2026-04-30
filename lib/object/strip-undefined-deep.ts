/** Remove undefined recursively so Firestore updates stay valid. */
export function stripUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      const inner = stripUndefinedDeep(v) as Record<string, unknown>;
      if (inner && typeof inner === "object" && Object.keys(inner).length > 0) out[k] = inner;
    } else {
      out[k] = v;
    }
  }
  return out;
}
