const buckets = new Map<string, number[]>();

export function resetRateLimits(): void {
  buckets.clear();
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true };
}
