import { jest } from "@jest/globals";

const makeSejmRequest = jest.fn();

await jest.unstable_mockModule("../../src/utils/api.js", () => ({
  makeSejmRequest,
}));

const { getTermsTool } = await import("../../src/tools/terms.js");

beforeEach(() => {
  makeSejmRequest.mockReset();
});

describe("getTermsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequest.mockResolvedValue([{ term: 10 }]);

    const result = await getTermsTool.handler({ offset: 1, limit: 2 });

    expect(makeSejmRequest).toHaveBeenCalledWith("/term", {
      offset: 1,
      limit: 2,
    });
    expect(result.content[0].text).toContain("Fetched the list of Sejm terms:");
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequest.mockResolvedValue(null);

    const result = await getTermsTool.handler({});

    expect(result.content[0].text).toContain("Failed to fetch the list of terms.");
  });
});
