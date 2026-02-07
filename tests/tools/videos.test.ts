import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getVideosTool } from "../../src/tools/videos.js";

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

describe("getVideosTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue([{ id: 1 }]);

    const result = await getVideosTool.handler({ term: 10, offset: 1, limit: 2 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/videos", {
      offset: 1,
      limit: 2,
    });
    expect(result.content[0].text).toContain(
      "Fetched the list of video recordings for term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getVideosTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of video recordings for term 10."
    );
  });
});
