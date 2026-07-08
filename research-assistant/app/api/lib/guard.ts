type GuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function createResearchGuard({
  secret,
  maxPerMinute = 10,
}: { secret?: string; maxPerMinute?: number } = {}) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  function clientIp(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return "unknown";
  }

  function checkAuth(req: Request): GuardResult {
    const expected = secret ?? process.env.RESEARCH_API_SECRET;
    if (!expected) return { ok: true };
    const header = req.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (token !== expected) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }
    return { ok: true };
  }

  function checkRateLimit(req: Request): GuardResult {
    const ip = clientIp(req);
    const now = Date.now();
    let bucket = buckets.get(ip);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + 60_000 };
      buckets.set(ip, bucket);
    }
    bucket.count += 1;
    if (bucket.count > maxPerMinute) {
      return { ok: false, status: 429, error: "Rate limit exceeded" };
    }
    return { ok: true };
  }

  return { checkAuth, checkRateLimit };
}

export const guard = createResearchGuard({ maxPerMinute: 12 });
