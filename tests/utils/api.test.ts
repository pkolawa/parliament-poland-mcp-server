import { jest } from "@jest/globals";
import { makeSejmRequest, REQUEST_TIMEOUT_MS } from "../../src/utils/api.js";

const originalFetch = globalThis.fetch;
const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("makeSejmRequest", () => {
  it("builds the URL with params and returns JSON on success", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

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

  it("returns the HTTP status and message when the response is not ok", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      new Response("", { status: 404, statusText: "Not Found" })
    );

    const result = await makeSejmRequest("/term10/speeches");

    expect(result).toEqual({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/term10/speeches" },
    });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("aborts the request after the timeout", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const timeoutSpy = jest.spyOn(AbortSignal, "timeout");
    fetchMock.mockRejectedValue(
      new DOMException("The operation was aborted due to timeout", "TimeoutError")
    );

    const result = await makeSejmRequest("/term");

    expect(timeoutSpy).toHaveBeenCalledWith(REQUEST_TIMEOUT_MS);
    expect(result).toEqual({
      ok: false,
      error: { message: "Request to /sejm/term timed out after 15s" },
    });
  });

  it("returns the network error message without a status", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const result = await makeSejmRequest("/term");

    expect(result).toEqual({
      ok: false,
      error: { message: "Request to /sejm/term failed: fetch failed" },
    });
  });
});
