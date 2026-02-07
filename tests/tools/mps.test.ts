import { jest } from "@jest/globals";

const makeSejmRequest = jest.fn();

await jest.unstable_mockModule("../../src/utils/api.js", () => ({
  makeSejmRequest,
}));

const { getMpTool, getMpsTool } = await import("../../src/tools/mps.js");

beforeEach(() => {
  makeSejmRequest.mockReset();
});

describe("getMpsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequest.mockResolvedValue([{ id: 1 }]);

    const result = await getMpsTool.handler({ term: 10, offset: 0, limit: 2 });

    expect(makeSejmRequest).toHaveBeenCalledWith("/term10/MP", {
      offset: 0,
      limit: 2,
    });
    expect(result.content[0].text).toContain(
      "Fetched the list of MPs for term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequest.mockResolvedValue(null);

    const result = await getMpsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of MPs for term 10"
    );
  });
});

describe("getMpTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequest.mockResolvedValue({ id: 1, name: "Test" });

    const result = await getMpTool.handler({ term: 10, id: 1 });

    expect(makeSejmRequest).toHaveBeenCalledWith("/term10/MP/1");
    expect(result.content[0].text).toContain(
      "Fetched information about the MP with ID 1 in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequest.mockResolvedValue(null);

    const result = await getMpTool.handler({ term: 10, id: 1 });

    expect(result.content[0].text).toContain(
      "Failed to fetch information about the MP with ID 1 in term 10."
    );
  });
});
