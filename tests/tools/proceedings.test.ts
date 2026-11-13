import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import {
  getProceedingsTool,
  getProceedingTool,
  getCurrentProceedingTool,
} from "../../src/tools/proceedings.js";

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

describe("getProceedingsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ number: 1 }] });

    const result = await getProceedingsTool.handler({ term: 10, offset: 1, limit: 2 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/proceedings", {
      offset: 1,
      limit: 2,
    });
    expect(result.content[0].text).toContain(
      "Fetched the list of proceedings for term 10:"
    );
  });

  it("leaves out the agendas and schedules", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: [
        {
          number: 1,
          title: "1. Posiedzenie Sejmu",
          dates: ["2023-11-13"],
          current: false,
          agenda: "<ol><li>Ślubowanie poselskie</li></ol>",
        },
        { number: 0, title: "Planowane Posiedzenie Sejmu", dates: ["2027-01-13"], current: false },
        { number: 64, current: true, agenda: "<p>a</p>", schedule: "<p>b</p>", votings: "<p>c</p>", currentAffairs: "<p>d</p>" },
      ],
    });

    const result = await getProceedingsTool.handler({ term: 10 });

    expect(result.structuredContent).toEqual({
      items: [
        { number: 1, title: "1. Posiedzenie Sejmu", dates: ["2023-11-13"], current: false },
        { number: 0, title: "Planowane Posiedzenie Sejmu", dates: ["2027-01-13"], current: false },
        { number: 64, current: true },
      ],
    });
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getProceedingsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of proceedings for term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});

describe("getProceedingTool", () => {
  it("returns the sitting with its agenda as plain text", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: { number: 1, dates: ["2023-11-13"], agenda: "<ol><li><div>Ślubowanie poselskie</div></li></ol>" },
    });

    const result = await getProceedingTool.handler({ term: 10, proceeding: 1 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/proceedings/1");
    expect(result.content[0].text).toContain("Fetched sitting 1 for term 10:");
    expect(result.structuredContent).toEqual({ number: 1, dates: ["2023-11-13"], agenda: "- Ślubowanie poselskie" });
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getProceedingTool.handler({ term: 10, proceeding: 999 });

    expect(result.content[0].text).toContain("Failed to fetch sitting 999 for term 10.");
    expect(result.isError).toBe(true);
  });
});

describe("getCurrentProceedingTool", () => {
  it("returns the current sitting with its agenda as plain text", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: {
        number: 69,
        dates: ["2026-11-17"],
        agenda: "<ol><li><div>Sprawozdanie Komisji</div></li></ol>",
        votings: "<p><strong>w przygotowaniu</strong></p>",
      },
    });

    const result = await getCurrentProceedingTool.handler({ term: 10 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/proceedings/current");
    expect(result.content[0].text).toContain("Fetched the current sitting for term 10:");
    expect(result.structuredContent).toEqual({
      number: 69,
      dates: ["2026-11-17"],
      agenda: "- Sprawozdanie Komisji",
      votings: "w przygotowaniu",
    });
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getCurrentProceedingTool.handler({ term: 10 });

    expect(result.content[0].text).toContain("Failed to fetch the current sitting for term 10.");
    expect(result.isError).toBe(true);
  });
});
