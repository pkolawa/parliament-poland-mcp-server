import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import {
  getInterpellationTool,
  getInterpellationsTool,
  getInterpellationTextTool,
} from "../../src/tools/interpellations.js";

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

describe("getInterpellationsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ id: 12 }] });

    const result = await getInterpellationsTool.handler({
      term: 10,
      offset: 1,
      limit: 2,
      dateFrom: "2020-01-01",
      dateTo: "2020-02-01",
      title: "transport",
      number: 12,
      mp: 45,
      club: "KO",
      status: "ANSWERED",
      sort_by: "date",
    });

    expect(makeSejmRequestMock).toHaveBeenCalledWith(
      "/term10/interpellations",
      {
        offset: 1,
        limit: 2,
        dateFrom: "2020-01-01",
        dateTo: "2020-02-01",
        title: "transport",
        number: 12,
        mp: 45,
        club: "KO",
        status: "ANSWERED",
        sort_by: "date",
      }
    );
    expect(result.content[0].text).toContain(
      "Fetched the list of interpellations for term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getInterpellationsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of interpellations for term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});

describe("getInterpellationTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: { id: 12 } });

    const result = await getInterpellationTool.handler({ term: 10, id: 12 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith(
      "/term10/interpellations/12"
    );
    expect(result.content[0].text).toContain(
      "Fetched details for interpellation 12 in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getInterpellationTool.handler({ term: 10, id: 12 });

    expect(result.content[0].text).toContain(
      "Failed to fetch details for interpellation 12 in term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});

describe("getInterpellationTextTool", () => {
  it("returns the interpellation body as plain text", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: "<h1>Interpelacja nr 10</h1><p>Pani Minister!</p>" });

    const result = await getInterpellationTextTool.handler({ term: 10, num: 10 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith(
      "/term10/interpellations/10/body",
      undefined,
      { format: "html" }
    );
    expect(result.content[0].text).toBe(
      "Fetched the text of interpellation 10 in term 10:\n\nInterpelacja nr 10\n\nPani Minister!"
    );
  });

  it("returns the body of a reply when given its key", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: "<p>Odpowiedź</p>" });

    const result = await getInterpellationTextTool.handler({ term: 10, num: 10, replyKey: "CZLJNC" });

    expect(makeSejmRequestMock).toHaveBeenCalledWith(
      "/term10/interpellations/10/reply/CZLJNC/body",
      undefined,
      { format: "html" }
    );
    expect(result.content[0].text).toContain("Fetched the text of reply CZLJNC to interpellation 10 in term 10:");
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getInterpellationTextTool.handler({ term: 10, num: 10 });

    expect(result.content[0].text).toContain("Failed to fetch the text of interpellation 10 in term 10.");
    expect(result.isError).toBe(true);
  });
});
