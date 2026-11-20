import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getClubTool, getClubsTool } from "../../src/tools/clubs.js";

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

describe("getClubsTool", () => {
  it("returns all clubs by default", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ id: "KO" }, { id: "PiS" }] });

    const result = await getClubsTool.handler({ term: 10 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/clubs");
    expect(result.content[0].text).toContain("Fetched 2 clubs of term 10:");
    expect(result.structuredContent).toEqual({ total: 2, offset: 0, items: [{ id: "KO" }, { id: "PiS" }] });
  });

  it("paginates the list itself instead of passing offset and limit to the API", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ id: "KO" }, { id: "PiS" }, { id: "Lewica" }] });

    const result = await getClubsTool.handler({ term: 10, offset: 1, limit: 1 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/clubs");
    expect(result.content[0].text).toContain(
      "Fetched 1 of 3 clubs of term 10 (offset 1; pass offset=2 for the next page):"
    );
    expect(result.structuredContent).toEqual({ total: 3, offset: 1, nextOffset: 2, items: [{ id: "PiS" }] });
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getClubsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of clubs for term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});

describe("getClubTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: { id: "KO" } });

    const result = await getClubTool.handler({ term: 10, id: "KO" });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/clubs/KO");
    expect(result.content[0].text).toContain(
      "Fetched details for club KO in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getClubTool.handler({ term: 10, id: "KO" });

    expect(result.content[0].text).toContain(
      "Failed to fetch details for club KO in term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});
