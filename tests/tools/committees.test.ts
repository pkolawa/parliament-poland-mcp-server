import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getCommitteeTool, getCommitteesTool } from "../../src/tools/committees.js";

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

describe("getCommitteesTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue([{ id: "KFP" }]);

    const result = await getCommitteesTool.handler({ term: 10, offset: 1, limit: 2 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/committees", {
      offset: 1,
      limit: 2,
    });
    expect(result.content[0].text).toContain(
      "Fetched the list of committees for term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getCommitteesTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of committees for term 10."
    );
  });
});

describe("getCommitteeTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ id: "KFP" });

    const result = await getCommitteeTool.handler({ term: 10, id: "KFP" });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/committees/KFP");
    expect(result.content[0].text).toContain(
      "Fetched details for committee KFP in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getCommitteeTool.handler({ term: 10, id: "KFP" });

    expect(result.content[0].text).toContain(
      "Failed to fetch details for committee KFP in term 10."
    );
  });
});
