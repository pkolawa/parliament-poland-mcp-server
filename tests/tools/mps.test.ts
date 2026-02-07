import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getMpTool, getMpsTool } from "../../src/tools/mps.js";

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

describe("getMpsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue([{ id: 1 }]);

    const result = await getMpsTool.handler({ term: 10, offset: 0, limit: 2 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/MP", {
      offset: 0,
      limit: 2,
    });
    expect(result.content[0].text).toContain(
      "Fetched the list of MPs for term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getMpsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of MPs for term 10"
    );
  });
});

describe("getMpTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ id: 1, name: "Test" });

    const result = await getMpTool.handler({ term: 10, id: 1 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/MP/1");
    expect(result.content[0].text).toContain(
      "Fetched information about the MP with ID 1 in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getMpTool.handler({ term: 10, id: 1 });

    expect(result.content[0].text).toContain(
      "Failed to fetch information about the MP with ID 1 in term 10."
    );
  });
});
