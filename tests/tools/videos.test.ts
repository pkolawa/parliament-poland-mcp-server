import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getVideosTool, getVideosByDateTool } from "../../src/tools/videos.js";

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

describe("getVideosTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ id: 1 }] });

    const result = await getVideosTool.handler({ term: 10, offset: 1, limit: 2 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/videos", {
      offset: 1,
      limit: 2,
    });
    expect(result.content[0].text).toContain(
      "Fetched the list of video recordings for term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getVideosTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of video recordings for term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});

describe("getVideosByDateTool", () => {
  it("fetches transmissions for the given date", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ unid: "a" }] });

    const result = await getVideosByDateTool.handler({ term: 10, date: "2023-11-13" });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/videos/2023-11-13");
    expect(result.content[0].text).toContain("Fetched video transmissions for 2023-11-13 in term 10:");
  });

  it("fetches today's transmissions when no date is given", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [] });

    await getVideosByDateTool.handler({ term: 10 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/videos/today");
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getVideosByDateTool.handler({ term: 10 });

    expect(result.content[0].text).toContain("Failed to fetch video transmissions for today in term 10.");
    expect(result.isError).toBe(true);
  });
});
