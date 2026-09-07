import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 3000;

function pruneExpired(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
    if (buckets.size < MAX_BUCKETS) break;
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const vercelIp = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || realIp || vercelIp || "unknown";
}

export function rateLimit({ key, limit, windowMs, message }: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  pruneExpired(now);

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  current.count += 1;
  if (current.count <= limit) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return NextResponse.json(
    { error: message ?? "Troppe richieste. Riprova tra poco." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

export function ipRateLimit(
  req: Request,
  scope: string,
  options: Omit<RateLimitOptions, "key">
): NextResponse | null {
  return rateLimit({
    ...options,
    key: `${scope}:${getClientIp(req)}`,
  });
}
