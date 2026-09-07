type JsonCacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const jsonCache = new Map<string, JsonCacheEntry<unknown>>();

function makeCacheKey(url: string, init?: RequestInit) {
  const method = String(init?.method ?? "GET").toUpperCase();
  return `${method}:${url}`;
}

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const maybeError =
      typeof data === "object" && data !== null
        ? (data as Record<string, unknown>).error
        : undefined;
    throw new Error(typeof maybeError === "string" && maybeError.trim() ? maybeError : fallbackMessage);
  }

  return data as T;
}

export function clearJsonCache(prefix?: string) {
  if (!prefix) {
    jsonCache.clear();
    return;
  }

  for (const key of jsonCache.keys()) {
    if (key.includes(prefix)) jsonCache.delete(key);
  }
}

export function cachedJson<T>(
  url: string,
  options: RequestInit & { ttlMs?: number; fallbackMessage?: string } = {}
): Promise<T> {
  const { ttlMs = 30_000, fallbackMessage = "Errore caricamento dati", ...init } = options;
  const method = String(init.method ?? "GET").toUpperCase();

  if (method !== "GET" || ttlMs <= 0) {
    return fetch(url, init).then((response) => readJsonResponse<T>(response, fallbackMessage));
  }

  const key = makeCacheKey(url, init);
  const now = Date.now();
  const hit = jsonCache.get(key) as JsonCacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.promise;

  const promise = fetch(url, { ...init, cache: "no-store" })
    .then((response) => readJsonResponse<T>(response, fallbackMessage))
    .catch((error) => {
      jsonCache.delete(key);
      throw error;
    });

  jsonCache.set(key, { expiresAt: now + ttlMs, promise });
  return promise;
}
