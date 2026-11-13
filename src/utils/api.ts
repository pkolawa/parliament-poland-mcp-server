
const SEJM_API_BASE = "https://api.sejm.gov.pl/sejm";
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
// Terms, MPs, clubs, committees and bilateral groups (lists and single items).
const RARELY_CHANGING_ENDPOINT = /^\/term(\d+\/(MP|clubs|committees|bilateralGroups)(\/[^/]+)?)?$/;

export interface SejmApiError {
  /** HTTP status code; absent for timeouts and network failures. */
  status?: number;
  message: string;
}

export type SejmApiResult<T> =
  /** `notice` is set when the data comes from the cache because the API is unavailable. */
  | { ok: true; data: T; notice?: string }
  | { ok: false; error: SejmApiError };

type Attempt<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: SejmApiError;
      /** The API is down or overloaded rather than rejecting this request. */
      unavailable: boolean;
      retryable: boolean;
      retryAfterMs?: number;
    };

const cache = new Map<string, { data: unknown; fetchedAt: number }>();

export function clearSejmCache(): void {
  cache.clear();
}

function remember(key: string, data: unknown): void {
  cache.delete(key);
  cache.set(key, { data, fetchedAt: Date.now() });
  if (cache.size > MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value as string);
  }
}

function parseRetryAfter(header: string | null): number | undefined {
  const seconds = Number(header);
  return header && Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

async function fetchOnce<T>(url: URL): Promise<Attempt<T>> {
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.ok) {
      return { ok: true, data: (await res.json()) as T };
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
          ? `Request to ${url.pathname} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
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
  params?: Record<string, string | number | boolean | undefined>
): Promise<SejmApiResult<T>> {
  const url = new URL(`${SEJM_API_BASE}${endpoint}`);
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
    RARELY_CHANGING_ENDPOINT.test(endpoint) &&
    Date.now() - cached.fetchedAt < FRESH_TTL_MS
  ) {
    return { ok: true, data: cached.data as T };
  }

  let attempt = await fetchOnce<T>(url);
  let attempts = 1;
  for (const delay of RETRY_DELAYS_MS) {
    if (attempt.ok || !attempt.retryable) {
      break;
    }
    console.error(`Sejm API request error, retrying: ${attempt.error.message}`);
    await sleep(Math.min(attempt.retryAfterMs ?? delay, MAX_RETRY_AFTER_MS));
    attempt = await fetchOnce<T>(url);
    attempts++;
  }

  if (attempt.ok) {
    remember(key, attempt.data);
    return { ok: true, data: attempt.data };
  }

  const reason = attempts > 1 ? `${attempt.error.message} (${attempts} attempts)` : attempt.error.message;
  console.error("Sejm API request error:", reason);

  if (attempt.unavailable && cached && Date.now() - cached.fetchedAt < STALE_TTL_MS) {
    return {
      ok: true,
      data: cached.data as T,
      notice:
        `Note: the Sejm API is currently unavailable (${reason}). ` +
        `Showing cached data fetched at ${new Date(cached.fetchedAt).toISOString()}; it may be out of date.\n\n`,
    };
  }

  const hint = attempt.unavailable
    ? " The Sejm API is temporarily unavailable; try again in a few minutes."
    : attempt.error.status === 404
      ? " The requested resource does not exist; check the term, numbers and dates passed to the tool."
      : "";
  return { ok: false, error: { ...attempt.error, message: `${reason}.${hint}` } };
}
