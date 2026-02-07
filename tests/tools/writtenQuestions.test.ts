import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getWrittenQuestionsTool } from "../../src/tools/writtenQuestions.js";

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

describe("getWrittenQuestionsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue([{ id: 1 }]);

    const result = await getWrittenQuestionsTool.handler({
      term: 10,
      offset: 1,
      limit: 2,
      sort_by: "date",
      title: "budget",
      from: "1",
      to: "Ministry",
      since: "2020-01-01",
      till: "2020-02-01",
      modifiedSince: "2020-02-10",
    });

    expect(makeSejmRequestMock).toHaveBeenCalledWith(
      "/term10/written-questions",
      {
        offset: 1,
        limit: 2,
        sort_by: "date",
        title: "budget",
        from: "1",
        to: "Ministry",
        since: "2020-01-01",
        till: "2020-02-01",
        modifiedSince: "2020-02-10",
      }
    );
    expect(result.content[0].text).toContain(
      "Fetched the list of written questions for term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue(null);

    const result = await getWrittenQuestionsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of written questions for term 10."
    );
  });
});
