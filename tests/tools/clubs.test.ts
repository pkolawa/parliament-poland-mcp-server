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
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue([{ id: "KO" }]);

    const result = await getClubsTool.handler({ term: 10, offset: 1, limit: 2 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/clubs", {
      offset: 1,
      limit: 2,
    });
    expect(result.content[0].text).toContain(
      "Fetched the list of clubs for term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getClubsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of clubs for term 10."
    );
  });
});

describe("getClubTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ id: "KO" });

    const result = await getClubTool.handler({ term: 10, id: "KO" });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/clubs/KO");
    expect(result.content[0].text).toContain(
      "Fetched details for club KO in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getClubTool.handler({ term: 10, id: "KO" });

    expect(result.content[0].text).toContain(
      "Failed to fetch details for club KO in term 10."
    );
  });
});
