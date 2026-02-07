import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getProceedingsTool } from "../../src/tools/proceedings.js";

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
    makeSejmRequestMock.mockResolvedValue([{ number: 1 }]);

    const result = await getProceedingsTool.handler({ term: 10, offset: 1, limit: 2 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/proceedings", {
      offset: 1,
      limit: 2,
    });
    expect(result.content[0].text).toContain(
      "Fetched the list of proceedings for term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getProceedingsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of proceedings for term 10."
    );
  });
});
