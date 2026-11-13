import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getVotingsTool, getVotingTool, searchVotingsTool } from "../../src/tools/votings.js";

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

describe("getVotingsTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ id: 1 }] });

    const result = await getVotingsTool.handler({
      term: 10,
      proceeding: 5,
      offset: 1,
      limit: 2,
    });

    expect(makeSejmRequestMock).toHaveBeenCalledWith(
      "/term10/votings/5",
      { offset: 1, limit: 2 }
    );
    expect(result.content[0].text).toContain(
      "Fetched the list of votings for term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getVotingsTool.handler({ term: 10, proceeding: 5 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of votings for term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});

describe("getVotingTool", () => {
  const voting = {
    votingNumber: 5,
    title: "Ustawa",
    yes: 2,
    no: 1,
    votes: [
      { MP: 1, club: "KO", firstName: "A", lastName: "A", vote: "YES" },
      { MP: 2, club: "KO", firstName: "B", lastName: "B", vote: "YES" },
      { MP: 3, club: "PiS", firstName: "C", lastName: "C", vote: "NO" },
      { MP: 4, club: "PiS", firstName: "D", lastName: "D", vote: "ABSENT" },
    ],
  };

  function parsed(text: string) {
    return JSON.parse(text.slice(text.indexOf("\n\n") + 2));
  }

  it("returns the voting with a breakdown by club and without individual votes by default", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: voting });

    const result = await getVotingTool.handler({ term: 10, sitting: 3, votingNumber: 5 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/votings/3/5");
    expect(result.content[0].text).toContain("Fetched voting 5 from sitting 3 in term 10:");
    const data = parsed(result.content[0].text);
    expect(data.votesByClub).toEqual({ KO: { YES: 2 }, PiS: { NO: 1, ABSENT: 1 } });
    expect(data.yes).toBe(2);
    expect(data.votes).toBeUndefined();
  });

  it("returns individual votes when asked, optionally for one club", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: voting });

    const all = await getVotingTool.handler({ term: 10, sitting: 3, votingNumber: 5, includeVotes: true });
    const pis = await getVotingTool.handler({ term: 10, sitting: 3, votingNumber: 5, club: "pis" });

    expect(parsed(all.content[0].text).votes).toHaveLength(4);
    expect(parsed(pis.content[0].text).votes.map((v: { MP: number }) => v.MP)).toEqual([3, 4]);
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getVotingTool.handler({ term: 10, sitting: 3, votingNumber: 5 });

    expect(result.content[0].text).toContain("Failed to fetch voting 5 from sitting 3 in term 10.");
    expect(result.isError).toBe(true);
  });
});

describe("searchVotingsTool", () => {
  it("passes the filters to the search endpoint", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: [{ votingNumber: 1 }] });

    const result = await searchVotingsTool.handler({
      term: 10,
      title: "energii",
      proceeding: 2,
      dateFrom: "2024-01-01",
      dateTo: "2024-02-01",
      offset: 0,
      limit: 5,
    });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/votings/search", {
      title: "energii",
      proceeding: 2,
      dateFrom: "2024-01-01",
      dateTo: "2024-02-01",
      offset: 0,
      limit: 5,
    });
    expect(result.content[0].text).toContain("Found 1 votings in term 10:");
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await searchVotingsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain("Failed to search votings in term 10.");
    expect(result.isError).toBe(true);
  });
});
