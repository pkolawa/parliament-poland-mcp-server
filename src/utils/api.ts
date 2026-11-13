export const REQUEST_TIMEOUT_MS = 15_000;
/**
 * Delays before each retry of a transient failure (429, 502–504, network error).
 * Timeouts are not retried: three 15s attempts would outlast typical MCP client timeouts.
 */
export const RETRY_DELAYS_MS = [1_000, 3_000];
const MAX_RETRY_AFTER_MS = 10_000;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

/** How long rarely changing resources are served from the cache without calling the API. */
export const FRESH_TTL_MS = 60 * 60 * 1000;
/** How old a cached response may be and still be returned while the API is unavailable. */
export const STALE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
/** Total length of cached response bodies; the text of a single long act is over 2 million characters. */
export const MAX_CACHE_CHARS = 20_000_000;

const APIS = {
  sejm: {
    base: "https://api.sejm.gov.pl/sejm",
    name: "Sejm API",
    // Terms, MPs, clubs, committees and bilateral groups (lists and single items).
    rarelyChanging: /^\/term(\d+\/(MP|clubs|committees|bilateralGroups)(\/[^/]+)?)?$/,
    notFoundHint: "The requested resource does not exist; check the term, numbers and dates passed to the tool.",
  },
  eli: {
    base: "https://api.sejm.gov.pl/eli",
    name: "ELI API",
    // Dictionaries and published acts: their metadata, structure and text (whole or a fragment).
    rarelyChanging: /^\/(keywords|types|statuses|acts\/[A-Z]+\/\d+\/\d+(\/(struct|text\.html(\/.+)?))?)$/,
    notFoundHint: "The requested act does not exist; check the publisher, year and position passed to the tool.",
  },
} as const;

export interface SejmApiError {
  /** HTTP status code; absent for timeouts and network failures. */
  status?: number;
  message: string;
}

export interface SejmRequestOptions {
  /** "html" for endpoints that return an HTML document, such as statement or interpellation bodies. */
  format?: "json" | "html";
  /** "eli" for the legal acts API (https://api.sejm.gov.pl/eli); defaults to the Sejm API. */
  api?: keyof typeof APIS;
  /** Overrides REQUEST_TIMEOUT_MS for endpoints known to be slow, such as the text of a long act. */
  timeoutMs?: number;
}

export type SejmApiResult<T> =
  /** `notice` is set when the data comes from the cache because the API is unavailable. */
  | { ok: true; data: T; notice?: string }
  | { ok: false; error: SejmApiError };

type Attempt<T> =
  | { ok: true; data: T; size: number }
  | {
      ok: false;
      error: SejmApiError;
      /** The API is down or overloaded rather than rejecting this request. */
      unavailable: boolean;
      retryable: boolean;
      retryAfterMs?: number;
    };

const cache = new Map<string, { data: unknown; fetchedAt: number; size: number }>();
let cachedChars = 0;

export function clearSejmCache(): void {
  cache.clear();
  cachedChars = 0;
}

function forget(key: string): void {
  cachedChars -= cache.get(key)?.size ?? 0;
  cache.delete(key);
}

function remember(key: string, data: unknown, size: number): void {
  forget(key);
  cache.set(key, { data, fetchedAt: Date.now(), size });
  cachedChars += size;
  while (cache.size > MAX_CACHE_ENTRIES || cachedChars > MAX_CACHE_CHARS) {
    forget(cache.keys().next().value as string);
  }
}

function parseRetryAfter(header: string | null): number | undefined {
  const seconds = Number(header);
  return header && Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

async function fetchOnce<T>(url: URL, format: "json" | "html", timeoutMs: number): Promise<Attempt<T>> {
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: format === "html" ? "text/html" : "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) {
      const body = await res.text();
      return { ok: true, data: (format === "html" ? body : JSON.parse(body)) as T, size: body.length };
    }
    const retryable = RETRYABLE_STATUSES.has(res.status);
    return {
      ok: false,
      error: {
        status: res.status,
        message: `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""} for ${url.pathname}`,
      },
      unavailable: retryable,
      retryable,
      retryAfterMs: parseRetryAfter(res.headers.get("retry-after")),
    };
  } catch (err) {
    // AbortSignal.timeout rejects with a DOMException, which is not always an Error instance.
    const { name, message } = (err ?? {}) as { name?: string; message?: string };
    const timedOut = name === "TimeoutError";
    return {
      ok: false,
      error: {
        message: timedOut
          ? `Request to ${url.pathname} timed out after ${timeoutMs / 1000}s`
          : `Request to ${url.pathname} failed: ${message ?? String(err)}`,
      },
      unavailable: true,
      retryable: !timedOut,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function makeSejmRequest<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
  options: SejmRequestOptions = {}
): Promise<SejmApiResult<T>> {
  const format = options.format ?? "json";
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const api = APIS[options.api ?? "sejm"];
  const url = new URL(`${api.base}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const key = url.toString();
  const cached = cache.get(key);
  if (
    cached &&
    api.rarelyChanging.test(endpoint) &&
    Date.now() - cached.fetchedAt < FRESH_TTL_MS
  ) {
    return { ok: true, data: cached.data as T };
  }

  let attempt = await fetchOnce<T>(url, format, timeoutMs);
  let attempts = 1;
  for (const delay of RETRY_DELAYS_MS) {
    if (attempt.ok || !attempt.retryable) {
      break;
    }
    console.error(`${api.name} request error, retrying: ${attempt.error.message}`);
    await sleep(Math.min(attempt.retryAfterMs ?? delay, MAX_RETRY_AFTER_MS));
    attempt = await fetchOnce<T>(url, format, timeoutMs);
    attempts++;
  }

  if (attempt.ok) {
    remember(key, attempt.data, attempt.size);
    return { ok: true, data: attempt.data };
  }

  const reason = attempts > 1 ? `${attempt.error.message} (${attempts} attempts)` : attempt.error.message;
  console.error(`${api.name} request error:`, reason);

  if (attempt.unavailable && cached && Date.now() - cached.fetchedAt < STALE_TTL_MS) {
    return {
      ok: true,
      data: cached.data as T,
      notice:
        `Note: the ${api.name} is currently unavailable (${reason}). ` +
        `Showing cached data fetched at ${new Date(cached.fetchedAt).toISOString()}; it may be out of date.\n\n`,
    };
  }

  const hint = attempt.unavailable
    ? ` The ${api.name} is temporarily unavailable; try again in a few minutes.`
    : attempt.error.status === 404
      ? ` ${api.notFoundHint}`
      : "";
  return { ok: false, error: { ...attempt.error, message: `${reason}.${hint}` } };
}
