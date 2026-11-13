import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getTermsTool } from "../../src/tools/terms.js";

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

describe("getTermsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ num: 9 }, { num: 10 }] });

    const result = await getTermsTool.handler({});

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term");
    expect(result.content[0].text).toContain("Fetched 2 Sejm terms:");
    expect(result.structuredContent).toEqual({ total: 2, offset: 0, items: [{ num: 9 }, { num: 10 }] });
  });

  it("paginates the list itself", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ num: 9 }, { num: 10 }] });

    const result = await getTermsTool.handler({ offset: 1, limit: 2 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term");
    expect(result.structuredContent).toEqual({ total: 2, offset: 1, items: [{ num: 10 }] });
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getTermsTool.handler({});

    expect(result.content[0].text).toContain("Failed to fetch the list of terms.");
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});
