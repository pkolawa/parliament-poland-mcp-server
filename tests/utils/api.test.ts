import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";

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

    expect(result).toEqual({ ok: true });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(String(url));
    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      "https://api.sejm.gov.pl/sejm/term"
    );
    expect(parsed.searchParams.get("offset")).toBe("2");
    expect(parsed.searchParams.get("limit")).toBe("5");
    expect(options).toEqual({ headers: { Accept: "application/json" } });
  });

  it("returns null and logs when the request fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));

    const result = await makeSejmRequest("/term");

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});
