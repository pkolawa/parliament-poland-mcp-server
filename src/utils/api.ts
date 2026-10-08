
const SEJM_API_BASE = "https://api.sejm.gov.pl/sejm";
export const REQUEST_TIMEOUT_MS = 15_000;

export interface SejmApiError {
  /** HTTP status code; absent for timeouts and network failures. */
  status?: number;
  message: string;
}

export type SejmApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SejmApiError };

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

  const headers = { Accept: "application/json" };
  let error: SejmApiError;
  try {
    const res = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.ok) {
      return { ok: true, data: (await res.json()) as T };
    }
    error = {
      status: res.status,
      message: `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""} for ${url.pathname}`,
    };
  } catch (err) {
    // AbortSignal.timeout rejects with a DOMException, which is not always an Error instance.
    const { name, message } = (err ?? {}) as { name?: string; message?: string };
    error = {
      message: name === "TimeoutError"
        ? `Request to ${url.pathname} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
        : `Request to ${url.pathname} failed: ${message ?? String(err)}`,
    };
  }

  console.error("Sejm API request error:", error.message);
  return { ok: false, error };
}
