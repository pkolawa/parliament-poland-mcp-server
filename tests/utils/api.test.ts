import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = jest.fn() as any;
});

afterEach(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  } else {
    delete (globalThis as any).fetch;
  }
  jest.restoreAllMocks();
});

describe("makeSejmRequest", () => {
  it("builds the URL with params and returns JSON on success", async () => {
    const json = jest.fn().mockResolvedValue({ ok: true });
    (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: true, json });

    const result = await makeSejmRequest("/term", { offset: 2, limit: 5 });

    expect(result).toEqual({ ok: true });
    const [url, options] = (globalThis.fetch as jest.Mock).mock.calls[0];
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      "https://api.sejm.gov.pl/sejm/term"
    );
    expect(parsed.searchParams.get("offset")).toBe("2");
    expect(parsed.searchParams.get("limit")).toBe("5");
    expect(options).toEqual({ headers: { Accept: "application/json" } });
  });

  it("returns null and logs when the request fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await makeSejmRequest("/term");

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});
