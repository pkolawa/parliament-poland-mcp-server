import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getProcessTool } from "../../src/tools/process.js";

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

describe("getProcessTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ number: 77 });

    const result = await getProcessTool.handler({ term: 10, processNumber: 77 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/process/77");
    expect(result.content[0].text).toContain(
      "Fetched process 77 for term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getProcessTool.handler({ term: 10, processNumber: 77 });

    expect(result.content[0].text).toContain(
      "Failed to fetch process 77 for term 10."
    );
  });
});
