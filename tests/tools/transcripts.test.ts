import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getTranscriptsTool, getStatementTool } from "../../src/tools/transcripts.js";

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

describe("getTranscriptsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: { proceedingNum: 1, date: "2023-11-13", statements: [{ num: 0 }] },
    });

    const result = await getTranscriptsTool.handler({
      term: 10,
      proceeding: 1,
      date: "2023-11-13",
    });

    expect(makeSejmRequestMock).toHaveBeenCalledWith(
      "/term10/proceedings/1/2023-11-13/transcripts"
    );
    expect(result.content[0].text).toContain(
      "Fetched the transcript statements for sitting 1 on 2023-11-13 in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getTranscriptsTool.handler({
      term: 10,
      proceeding: 1,
      date: "2023-11-13",
    });

    expect(result.content[0].text).toContain(
      "Failed to fetch the transcript statements for sitting 1 on 2023-11-13 in term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});

describe("getStatementTool", () => {
  it("requests the statement as HTML and returns it as plain text", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: "<html><head><title>x</title></head><body><h2>Marszałek:</h2><p>Otwieram posiedzenie.</p></body></html>",
    });

    const result = await getStatementTool.handler({ term: 10, proceeding: 1, date: "2023-11-13", statementNum: 0 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith(
      "/term10/proceedings/1/2023-11-13/transcripts/0",
      undefined,
      { format: "html" }
    );
    expect(result.content[0].text).toBe(
      "Fetched statement 0 from sitting 1 on 2023-11-13 in term 10:\n\nMarszałek:\n\nOtwieram posiedzenie."
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getStatementTool.handler({ term: 10, proceeding: 1, date: "2023-11-13", statementNum: 3 });

    expect(result.content[0].text).toContain(
      "Failed to fetch statement 3 from sitting 1 on 2023-11-13 in term 10."
    );
    expect(result.isError).toBe(true);
  });
});
