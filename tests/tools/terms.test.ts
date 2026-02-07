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
    makeSejmRequestMock.mockResolvedValue([{ term: 10 }]);

    const result = await getTermsTool.handler({ offset: 1, limit: 2 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term", {
      offset: 1,
      limit: 2,
    });
    expect(result.content[0].text).toContain("Fetched the list of Sejm terms:");
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getTermsTool.handler({});

    expect(result.content[0].text).toContain("Failed to fetch the list of terms.");
  });
});
