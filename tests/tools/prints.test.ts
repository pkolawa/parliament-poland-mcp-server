import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getPrintTool, getPrintsTool } from "../../src/tools/prints.js";

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

describe("getPrintsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue([{ number: 123 }]);

    const result = await getPrintsTool.handler({ term: 10, offset: 1, limit: 2, sort_by: "date" });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/prints", {
      offset: 1,
      limit: 2,
      sort_by: "date",
    });
    expect(result.content[0].text).toContain(
      "Fetched the list of prints for term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getPrintsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of prints for term 10."
    );
  });
});

describe("getPrintTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ number: 123 });

    const result = await getPrintTool.handler({ term: 10, printNumber: 123 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/prints/123");
    expect(result.content[0].text).toContain(
      "Fetched details for print 123 in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getPrintTool.handler({ term: 10, printNumber: 123 });

    expect(result.content[0].text).toContain(
      "Failed to fetch details for print 123 in term 10."
    );
  });
});
