import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import {
  buildToolResponse,
  describeFilters,
  describePage,
  paginate,
  resolveTerm,
  withTerm,
} from "../../src/utils/tool.js";
import { getMpsTool } from "../../src/tools/mps.js";

type MakeSejmRequestFn = (endpoint: string, params?: Record<string, unknown>) => Promise<unknown>;

jest.mock("../../src/utils/api.js", () => ({
  makeSejmRequest: jest.fn(),
}));

const makeSejmRequestMock = makeSejmRequest as jest.MockedFunction<MakeSejmRequestFn>;

beforeEach(() => {
  makeSejmRequestMock.mockReset();
});

const terms = [
  { num: 9, current: false },
  { num: 10, current: true },
];

describe("buildToolResponse", () => {
  it("returns compact JSON after the message and the data as structured content", () => {
    const result = buildToolResponse(
      { ok: true, data: { id: 1, name: "Test" } },
      "Fetched:",
      "Failed."
    );

    expect(result.content).toEqual([{ type: "text", text: 'Fetched:\n\n{"id":1,"name":"Test"}' }]);
    expect(result.structuredContent).toEqual({ id: 1, name: "Test" });
    expect(result.isError).toBeUndefined();
  });

  it("wraps lists in an items object", () => {
    const result = buildToolResponse({ ok: true, data: [{ id: 1 }, { id: 2 }] }, "Fetched:", "Failed.");

    expect(result.content[0].text).toBe('Fetched:\n\n[{"id":1},{"id":2}]');
    expect(result.structuredContent).toEqual({ items: [{ id: 1 }, { id: 2 }] });
  });

  it("prefixes the text with the cache notice and adds it to the structured content", () => {
    const result = buildToolResponse(
      { ok: true, data: [{ id: 1 }], notice: "Note: the Sejm API is currently unavailable.\n\n" },
      "Fetched:",
      "Failed."
    );

    expect(result.content[0].text).toBe(
      'Note: the Sejm API is currently unavailable.\n\nFetched:\n\n[{"id":1}]'
    );
    expect(result.structuredContent).toEqual({
      items: [{ id: 1 }],
      notice: "Note: the Sejm API is currently unavailable.",
    });
  });

  it("transforms the data and builds the message from the result", () => {
    const result = buildToolResponse(
      { ok: true, data: [1, 2, 3] },
      (data: number[]) => `Found ${data.length} items:`,
      "Failed.",
      (data) => data.filter((n) => n > 1)
    );

    expect(result.content[0].text).toBe("Found 2 items:\n\n[2,3]");
  });

  it("returns plain text as is, without structured content", () => {
    const result = buildToolResponse(
      { ok: true, data: "<p>Tekst</p>" },
      "Fetched the text:",
      "Failed.",
      (html) => html.replace(/<[^>]+>/g, "")
    );

    expect(result.content[0].text).toBe("Fetched the text:\n\nTekst");
    expect(result.structuredContent).toBeUndefined();
  });

  it("returns the failure message with the error and isError", () => {
    const result = buildToolResponse(
      { ok: false, error: { status: 404, message: "HTTP 404 Not Found for /sejm/term10/MP/0" } },
      "Fetched:",
      "Failed to fetch the MP."
    );

    expect(result).toEqual({
      content: [{ type: "text", text: "Failed to fetch the MP.\n\nError: HTTP 404 Not Found for /sejm/term10/MP/0" }],
      isError: true,
    });
  });
});

describe("resolveTerm", () => {
  it("returns the given term without calling the API", async () => {
    await expect(resolveTerm(9)).resolves.toEqual({ ok: true, term: 9 });
    expect(makeSejmRequestMock).not.toHaveBeenCalled();
  });

  it("returns the current term when none is given", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: terms });

    await expect(resolveTerm(undefined)).resolves.toEqual({ ok: true, term: 10 });
    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term");
  });

  it("falls back to the latest term when none is marked current", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: [{ num: 9, current: false }, { num: 10, current: false }, { num: 8 }],
    });

    await expect(resolveTerm(undefined)).resolves.toEqual({ ok: true, term: 10 });
  });

  it("returns the error when the list of terms is unavailable", async () => {
    const error = { status: 503, message: "HTTP 503 Service Unavailable for /sejm/term" };
    makeSejmRequestMock.mockResolvedValue({ ok: false, error });

    await expect(resolveTerm(undefined)).resolves.toEqual({ ok: false, error });
  });
});

describe("withTerm", () => {
  it("reports that the term could not be determined", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [] });
    const run = jest.fn(async () => buildToolResponse({ ok: true, data: {} }, "Fetched:", "Failed."));

    const result = await withTerm(undefined, run);

    expect(run).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      "Failed to determine the current term of the Sejm; pass the term number explicitly.\n\n" +
        "Error: The Sejm API returned no terms."
    );
  });
});

describe("tools without a term", () => {
  it("use the current term", async () => {
    makeSejmRequestMock
      .mockResolvedValueOnce({ ok: true, data: terms })
      .mockResolvedValueOnce({ ok: true, data: [{ id: 1 }] });

    const result = await getMpsTool.handler({ limit: 1 });

    expect(makeSejmRequestMock).toHaveBeenNthCalledWith(1, "/term");
    expect(makeSejmRequestMock).toHaveBeenNthCalledWith(2, "/term10/MP");
    expect(result.content[0].text).toContain("Fetched 1 MPs of term 10:");
  });
});

describe("paginate", () => {
  const items = [1, 2, 3, 4, 5];

  it("returns one page with the total and the offset of the next page", () => {
    expect(paginate(items, 0, 2)).toEqual({ total: 5, offset: 0, nextOffset: 2, items: [1, 2] });
    expect(paginate(items, 2, 2)).toEqual({ total: 5, offset: 2, nextOffset: 4, items: [3, 4] });
  });

  it("leaves out nextOffset on the last page", () => {
    expect(paginate(items, 4, 2)).toEqual({ total: 5, offset: 4, items: [5] });
    expect(paginate(items, 3, 2)).toEqual({ total: 5, offset: 3, items: [4, 5] });
  });

  it("returns everything from the offset when there is no limit", () => {
    expect(paginate(items)).toEqual({ total: 5, offset: 0, items });
    expect(paginate(items, 3)).toEqual({ total: 5, offset: 3, items: [4, 5] });
  });

  it("returns no items past the end of the list", () => {
    expect(paginate(items, 10, 2)).toEqual({ total: 5, offset: 10, items: [] });
  });
});

describe("describePage", () => {
  it("says how much of the list the page holds and how to get the next page", () => {
    expect(describePage(paginate([1, 2, 3], 0, 2), "MPs")).toBe(
      "2 of 3 MPs (offset 0; pass offset=2 for the next page)"
    );
    expect(describePage(paginate([1, 2, 3], 2, 2), "MPs")).toBe("1 of 3 MPs (offset 2; last page)");
    expect(describePage(paginate([1, 2, 3], 0, 5), "MPs")).toBe("3 MPs");
    expect(describePage(paginate([], 0, 5), "MPs")).toBe("no MPs");
    expect(describePage(paginate([1, 2, 3], 5, 5), "MPs")).toBe(
      "0 of 3 MPs (offset 5 is past the end of the list)"
    );
  });
});

describe("describeFilters", () => {
  it("lists the filters that are set", () => {
    expect(describeFilters({ club: "KO", name: undefined, active: false })).toBe(" matching club=KO, active=false");
    expect(describeFilters({ club: undefined })).toBe("");
  });
});
