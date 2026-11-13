import { jest } from "@jest/globals";
import {
  clearSejmCache,
  FRESH_TTL_MS,
  makeSejmRequest,
  REQUEST_TIMEOUT_MS,
  RETRY_DELAYS_MS,
  STALE_TTL_MS,
} from "../../src/utils/api.js";

const originalFetch = globalThis.fetch;
const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();

function json(body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  );
}

function status(code: number, statusText: string, headers?: Record<string, string>): Promise<Response> {
  return Promise.resolve(new Response("", { status: code, statusText, headers }));
}

/** Runs a request to completion while fake timers fast-forward the retry delays. */
async function settle<T>(promise: Promise<T>): Promise<T> {
  await jest.runAllTimersAsync();
  return promise;
}

beforeEach(() => {
  jest.useFakeTimers();
  clearSejmCache();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("makeSejmRequest", () => {
  it("builds the URL with params and returns JSON on success", async () => {
    fetchMock.mockImplementation(() => json({ ok: true }));

    const result = await makeSejmRequest("/term", { offset: 2, limit: 5 });

    expect(result).toEqual({ ok: true, data: { ok: true } });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(String(url));
    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      "https://api.sejm.gov.pl/sejm/term"
    );
    expect(parsed.searchParams.get("offset")).toBe("2");
    expect(parsed.searchParams.get("limit")).toBe("5");
    expect(options.headers).toEqual({ Accept: "application/json" });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("requests and returns HTML as text when asked for the html format", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response("<p>Tekst</p>", { status: 200, headers: { "content-type": "text/html" } }))
    );

    const result = await makeSejmRequest("/term10/interpellations/10/body", undefined, { format: "html" });

    expect(result).toEqual({ ok: true, data: "<p>Tekst</p>" });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toEqual({ Accept: "text/html" });
  });

  it("returns the HTTP status and a hint to check parameters on 404 without retrying", async () => {
    const errorSpy = jest.mocked(console.error);
    fetchMock.mockImplementation(() => status(404, "Not Found"));

    const result = await settle(makeSejmRequest("/term10/speeches"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: false,
      error: {
        status: 404,
        message:
          "HTTP 404 Not Found for /sejm/term10/speeches. The requested resource does not exist; " +
          "check the term, numbers and dates passed to the tool.",
      },
    });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("aborts the request after the timeout and does not retry it", async () => {
    const timeoutSpy = jest.spyOn(AbortSignal, "timeout");
    fetchMock.mockRejectedValue(
      new DOMException("The operation was aborted due to timeout", "TimeoutError")
    );

    const result = await settle(makeSejmRequest("/term"));

    expect(timeoutSpy).toHaveBeenCalledWith(REQUEST_TIMEOUT_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: false,
      error: {
        message:
          "Request to /sejm/term timed out after 15s. " +
          "The Sejm API is temporarily unavailable; try again in a few minutes.",
      },
    });
  });

  it("retries network errors and reports the number of attempts", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const result = await settle(makeSejmRequest("/term"));

    expect(fetchMock).toHaveBeenCalledTimes(RETRY_DELAYS_MS.length + 1);
    expect(result).toEqual({
      ok: false,
      error: {
        message:
          "Request to /sejm/term failed: fetch failed (3 attempts). " +
          "The Sejm API is temporarily unavailable; try again in a few minutes.",
      },
    });
  });

  it("retries a 503 and returns the data once the API recovers", async () => {
    fetchMock
      .mockImplementationOnce(() => status(503, "Service Unavailable"))
      .mockImplementationOnce(() => json([{ num: 10 }]));

    const result = await settle(makeSejmRequest("/term10/votings/1"));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: true, data: [{ num: 10 }] });
  });

  it("waits for Retry-After before retrying, capped at 10s", async () => {
    fetchMock
      .mockImplementationOnce(() => status(429, "Too Many Requests", { "retry-after": "2" }))
      .mockImplementationOnce(() => json([]));

    const promise = makeSejmRequest("/term10/votings/1");
    await jest.advanceTimersByTimeAsync(1_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expect(promise).resolves.toEqual({ ok: true, data: [] });
  });

  describe("cache", () => {
    it("serves rarely changing resources from the cache until they expire", async () => {
      fetchMock.mockImplementation(() => json([{ id: 1 }]));

      await makeSejmRequest("/term10/MP", { limit: 1 });
      const cached = await makeSejmRequest("/term10/MP", { limit: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(cached).toEqual({ ok: true, data: [{ id: 1 }] });

      await makeSejmRequest("/term10/MP", { limit: 2 });
      expect(fetchMock).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(FRESH_TTL_MS);
      await makeSejmRequest("/term10/MP", { limit: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("always fetches resources that change often", async () => {
      fetchMock.mockImplementation(() => json([]));

      await makeSejmRequest("/term10/votings/1");
      await makeSejmRequest("/term10/votings/1");

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("falls back to cached data with a notice while the API is unavailable", async () => {
      jest.setSystemTime(new Date("2026-11-13T10:00:00Z"));
      fetchMock.mockImplementationOnce(() => json([{ num: 1 }]));
      await makeSejmRequest("/term10/votings/1");

      fetchMock.mockImplementation(() => status(503, "Service Unavailable"));
      const result = await settle(makeSejmRequest("/term10/votings/1"));

      expect(result).toEqual({
        ok: true,
        data: [{ num: 1 }],
        notice:
          "Note: the Sejm API is currently unavailable " +
          "(HTTP 503 Service Unavailable for /sejm/term10/votings/1 (3 attempts)). " +
          "Showing cached data fetched at 2026-11-13T10:00:00.000Z; it may be out of date.\n\n",
      });
    });

    it("does not fall back to cached data older than the stale limit", async () => {
      fetchMock.mockImplementationOnce(() => json([{ num: 1 }]));
      await makeSejmRequest("/term10/votings/1");

      jest.advanceTimersByTime(STALE_TTL_MS);
      fetchMock.mockImplementation(() => status(503, "Service Unavailable"));
      const result = await settle(makeSejmRequest("/term10/votings/1"));

      expect(result.ok).toBe(false);
    });

    it("does not hide a 404 behind cached data", async () => {
      fetchMock.mockImplementationOnce(() => json([{ num: 1 }]));
      await makeSejmRequest("/term10/votings/1");

      fetchMock.mockImplementation(() => status(404, "Not Found"));
      const result = await settle(makeSejmRequest("/term10/votings/1"));

      expect(result.ok).toBe(false);
    });
  });
});
