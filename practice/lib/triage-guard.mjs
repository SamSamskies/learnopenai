export function createTriageGuard({ secret, maxPerMinute = 10 } = {}) {
  const buckets = new Map();

  function clientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0].trim();
    }
    return req.socket?.remoteAddress ?? "unknown";
  }

  function checkAuth(req) {
    const expected = secret ?? process.env.TRIAGE_API_SECRET;
    if (!expected) {
      return { ok: true };
    }
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (token !== expected) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }
    return { ok: true };
  }

  function checkRateLimit(req) {
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

export function sendJsonError(res, status, error) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error }));
}
