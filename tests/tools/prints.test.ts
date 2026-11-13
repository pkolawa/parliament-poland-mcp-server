import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { PRINT_PAGE_SIZE, getPrintTool, getPrintsTool } from "../../src/tools/prints.js";

type MakeSejmRequestFn = (
  endpoint: string,
  params?: Record<string, unknown>
) => Promise<unknown>;

jest.mock("../../src/utils/api.js", () => ({
  makeSejmRequest: jest.fn(),
}));

const makeSejmRequestMock =
  makeSejmRequest as jest.MockedFunction<MakeSejmRequestFn>;

beforeEach(() => {
  makeSejmRequestMock.mockReset();
});

describe("getPrintsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ number: 123 }] });

    const result = await getPrintsTool.handler({ term: 10, offset: 1, limit: 2, sort_by: "date" });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/prints", {
      offset: 1,
      limit: 2,
      sort_by: "date",
    });
    expect(result.content[0].text).toContain(
      "Fetched the list of prints for term 10:"
    );
  });

  it(`asks the API for ${PRINT_PAGE_SIZE} prints by default`, async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ number: "1" }] });

    await getPrintsTool.handler({ term: 10 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/prints", {
      offset: 0,
      limit: PRINT_PAGE_SIZE,
      sort_by: undefined,
    });
  });

  it("paginates the list itself when the API ignores offset and limit", async () => {
    const all = Array.from({ length: 10 }, (_, i) => ({ number: String(i + 1) }));
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: all });

    const result = await getPrintsTool.handler({ term: 10, offset: 4, limit: 3 });

    expect(result.structuredContent).toEqual({ items: [{ number: "5" }, { number: "6" }, { number: "7" }] });
  });

  it("keeps a page that the API already paginated", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ number: "5" }, { number: "6" }] });

    const result = await getPrintsTool.handler({ term: 10, offset: 4, limit: 3 });

    expect(result.structuredContent).toEqual({ items: [{ number: "5" }, { number: "6" }] });
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getPrintsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of prints for term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});

describe("getPrintTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: { number: 123 } });

    const result = await getPrintTool.handler({ term: 10, printNumber: "123" });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/prints/123");
    expect(result.content[0].text).toContain(
      "Fetched details for print 123 in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getPrintTool.handler({ term: 10, printNumber: "123" });

    expect(result.content[0].text).toContain(
      "Failed to fetch details for print 123 in term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});
