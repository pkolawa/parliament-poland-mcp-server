import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import {
  getCommitteeTool,
  getCommitteesTool,
  getCommitteeSittingsTool,
  getCommitteeSittingTool,
} from "../../src/tools/committees.js";

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

describe("getCommitteesTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ code: "ASW" }, { code: "KFP" }, { code: "OSZ" }] });

    const result = await getCommitteesTool.handler({ term: 10, offset: 1, limit: 2 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/committees");
    expect(result.content[0].text).toContain("Fetched 2 of 3 committees of term 10 (offset 1; last page):");
    expect(result.structuredContent).toEqual({ total: 3, offset: 1, items: [{ code: "KFP" }, { code: "OSZ" }] });
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getCommitteesTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of committees for term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});

describe("getCommitteeTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: { id: "KFP" } });

    const result = await getCommitteeTool.handler({ term: 10, id: "KFP" });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/committees/KFP");
    expect(result.content[0].text).toContain(
      "Fetched details for committee KFP in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getCommitteeTool.handler({ term: 10, id: "KFP" });

    expect(result.content[0].text).toContain(
      "Failed to fetch details for committee KFP in term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});

describe("getCommitteeSittingsTool", () => {
  const sittings = [
    { num: 1, date: "2024-01-10", agenda: "<div>Wybór Prezydium</div>", video: [{ unid: "a" }] },
    { num: 2, date: "2024-02-10", agenda: "<div>Projekt ustawy</div>", video: [] },
    { num: 3, date: "2024-03-10" },
  ];

  it("filters by date, converts the agenda to text and drops videos", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: sittings });

    const result = await getCommitteeSittingsTool.handler({
      term: 10,
      code: "ASW",
      dateFrom: "2024-01-10",
      dateTo: "2024-02-10",
    });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/committees/ASW/sittings", {
      cancelled: undefined,
    });
    const text = result.content[0].text;
    expect(text).toContain("Fetched 2 sittings of committee ASW in term 10:");
    expect(JSON.parse(text.slice(text.indexOf("\n\n") + 2))).toEqual([
      { num: 1, date: "2024-01-10", agenda: "Wybór Prezydium" },
      { num: 2, date: "2024-02-10", agenda: "Projekt ustawy" },
    ]);
  });

  it("paginates after filtering by date", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: sittings });

    const result = await getCommitteeSittingsTool.handler({
      term: 10,
      code: "ASW",
      dateFrom: "2024-02-01",
      offset: 1,
      limit: 1,
    });

    expect(result.content[0].text).toContain("Fetched 1 sittings of committee ASW in term 10:");
    expect(result.structuredContent).toEqual({ items: [{ num: 3, date: "2024-03-10" }] });
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getCommitteeSittingsTool.handler({ term: 10, code: "ASW" });

    expect(result.content[0].text).toContain("Failed to fetch the sittings of committee ASW in term 10.");
    expect(result.isError).toBe(true);
  });
});

describe("getCommitteeSittingTool", () => {
  it("returns the sitting with its agenda as plain text and keeps videos", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: { num: 1, agenda: "<div>Wybór Prezydium</div>", video: [{ unid: "a" }] },
    });

    const result = await getCommitteeSittingTool.handler({ term: 10, code: "ASW", num: 1 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/committees/ASW/sittings/1");
    expect(result.content[0].text).toContain("Fetched sitting 1 of committee ASW in term 10:");
    expect(result.structuredContent).toEqual({ num: 1, agenda: "Wybór Prezydium", video: [{ unid: "a" }] });
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getCommitteeSittingTool.handler({ term: 10, code: "ASW", num: 1 });

    expect(result.content[0].text).toContain("Failed to fetch sitting 1 of committee ASW in term 10.");
    expect(result.isError).toBe(true);
  });
});
