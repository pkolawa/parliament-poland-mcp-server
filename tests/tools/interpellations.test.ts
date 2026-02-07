import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getInterpellationTool, getInterpellationsTool } from "../../src/tools/interpellations.js";

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
    makeSejmRequestMock.mockResolvedValue([{ id: 12 }]);

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
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getInterpellationsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of interpellations for term 10."
    );
  });
});

describe("getInterpellationTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ id: 12 });

    const result = await getInterpellationTool.handler({ term: 10, id: 12 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith(
      "/term10/interpellations/12"
    );
    expect(result.content[0].text).toContain(
      "Fetched details for interpellation 12 in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getInterpellationTool.handler({ term: 10, id: 12 });

    expect(result.content[0].text).toContain(
      "Failed to fetch details for interpellation 12 in term 10."
    );
  });
});
