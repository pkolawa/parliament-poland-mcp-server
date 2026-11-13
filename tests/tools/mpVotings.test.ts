import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getMpVotingStatsTool, getMpVotingsTool } from "../../src/tools/mpVotings.js";

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

describe("getMpVotingStatsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ sitting: 1, numVoted: 8 }] });

    const result = await getMpVotingStatsTool.handler({ term: 10, id: 1 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/MP/1/votings/stats");
    expect(result.content[0].text).toContain(
      "Fetched voting statistics for the MP with ID 1 in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getMpVotingStatsTool.handler({ term: 10, id: 1 });

    expect(result.content[0].text).toContain(
      "Failed to fetch voting statistics for the MP with ID 1 in term 10."
    );
    expect(result.isError).toBe(true);
  });
});

describe("getMpVotingsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ votingNumber: 1, vote: "YES" }] });

    const result = await getMpVotingsTool.handler({ term: 10, id: 1, sitting: 1, date: "2023-11-13" });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/MP/1/votings/1/2023-11-13");
    expect(result.content[0].text).toContain(
      "Fetched the votes of the MP with ID 1 on 2023-11-13 (sitting 1, term 10):"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getMpVotingsTool.handler({ term: 10, id: 1, sitting: 1, date: "2023-11-13" });

    expect(result.content[0].text).toContain(
      "Failed to fetch the votes of the MP with ID 1 on 2023-11-13 (sitting 1, term 10)."
    );
    expect(result.isError).toBe(true);
  });
});
