import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getBilateralGroupsTool } from "../../src/tools/bilateralGroups.js";

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

describe("getBilateralGroupsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue([{ id: 1 }]);

    const result = await getBilateralGroupsTool.handler();

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/bilateralGroups");
    expect(result.content[0].text).toContain(
      "Fetched the list of bilateral groups:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getBilateralGroupsTool.handler();

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of bilateral groups."
    );
  });
});
