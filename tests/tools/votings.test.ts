import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import {
  VOTING_PAGE_SIZE,
  getVotingsTool,
  getVotingTool,
  searchVotingsTool,
} from "../../src/tools/votings.js";

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
  const voting = (votingNumber: number, date: string, title: string, topic: string) => ({
    term: 10,
    sitting: 5,
    sittingDay: 1,
    votingNumber,
    date,
    title,
    topic,
    description: topic,
    kind: "ELECTRONIC",
    yes: 230,
    no: 200,
    abstain: 10,
    links: [{ href: `https://api.sejm.gov.pl/sejm/term10/votings/5/${votingNumber}/pdf`, rel: "pdf" }],
  });
  const votings = [
    voting(1, "2024-01-10T10:00:00", "Pkt. 1 Projekt ustawy budżetowej na rok 2024", "głosowanie nad poprawką 1"),
    voting(2, "2024-01-10T10:05:00", "Pkt. 1 Projekt ustawy budżetowej na rok 2024", "głosowanie nad całością"),
    voting(3, "2024-01-11T09:00:00", "Pkt. 2 Projekt ustawy o podatku dochodowym", "głosowanie nad poprawką 2"),
    voting(4, "2024-01-11T09:10:00", "Pkt. 3 Wybór sędziów Trybunału Stanu", "wybór członków"),
  ];

  function parsed(text: string) {
    return JSON.parse(text.slice(text.indexOf("\n\n") + 2));
  }

  async function numbers(args: Partial<Parameters<typeof getVotingsTool.handler>[0]>) {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: votings });
    const result = await getVotingsTool.handler({ term: 10, proceeding: 5, ...args });
    return parsed(result.content[0].text).items.map((v: { votingNumber: number }) => v.votingNumber);
  }

  it("fetches the whole sitting and paginates it without passing offset or limit to the API", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: votings });

    const result = await getVotingsTool.handler({ term: 10, proceeding: 5, offset: 1, limit: 2 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/votings/5");
    expect(result.content[0].text).toContain(
      "Fetched 2 of 4 votings of sitting 5 in term 10 (offset 1; pass offset=3 for the next page):"
    );
    const data = parsed(result.content[0].text);
    expect(data).toMatchObject({ total: 4, offset: 1, nextOffset: 3 });
    expect(data.items.map((v: { votingNumber: number }) => v.votingNumber)).toEqual([2, 3]);
    expect(result.structuredContent).toEqual(data);
  });

  it("leaves out the PDF link and the term of each voting", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: votings });

    const result = await getVotingsTool.handler({ term: 10, proceeding: 5, limit: 1 });

    const item = parsed(result.content[0].text).items[0];
    expect(item.links).toBeUndefined();
    expect(item.term).toBeUndefined();
    expect(item).toMatchObject({ sitting: 5, votingNumber: 1, yes: 230, no: 200, abstain: 10 });
  });

  it(`returns ${VOTING_PAGE_SIZE} votings by default`, async () => {
    const many = Array.from({ length: VOTING_PAGE_SIZE + 10 }, (_, i) => ({ votingNumber: i + 1 }));
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: many });

    const result = await getVotingsTool.handler({ term: 10, proceeding: 5 });

    const data = parsed(result.content[0].text);
    expect(data.items).toHaveLength(VOTING_PAGE_SIZE);
    expect(data.nextOffset).toBe(VOTING_PAGE_SIZE);
  });

  it("filters by the day of the sitting", async () => {
    expect(await numbers({ date: "2024-01-11" })).toEqual([3, 4]);
  });

  it("lists the days with votings when none was held on the date", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: votings });

    const result = await getVotingsTool.handler({ term: 10, proceeding: 5, date: "2024-01-12" });

    expect(result.content[0].text).toContain(
      "Fetched no votings of sitting 5 in term 10 matching date=2024-01-12 (days with votings: 2024-01-10, 2024-01-11):"
    );
  });

  it("filters by words in the title, topic or description, ignoring case and diacritics", async () => {
    expect(await numbers({ title: "budżetowej" })).toEqual([1, 2]);
    expect(await numbers({ title: "BUDZET" })).toEqual([1, 2]);
    expect(await numbers({ title: "poprawka" })).toEqual([1, 3]);
    expect(await numbers({ title: "podatk poprawk" })).toEqual([3]);
    expect(await numbers({ title: "Trybunał Konstytucyjny" })).toEqual([]);
  });

  it("combines the date and title filters, then paginates", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: votings });

    const result = await getVotingsTool.handler({
      term: 10,
      proceeding: 5,
      date: "2024-01-10",
      title: "ustawy",
      limit: 1,
    });

    expect(result.content[0].text).toContain(
      "Fetched 1 of 2 votings of sitting 5 in term 10 matching date=2024-01-10, title=ustawy " +
        "(offset 0; pass offset=1 for the next page):"
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

  it("returns the same fields as get-votings", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: [{ term: 10, sitting: 2, votingNumber: 1, links: [{ href: "x", rel: "pdf" }] }],
    });

    const result = await searchVotingsTool.handler({ term: 10, title: "energii" });

    expect(result.structuredContent).toEqual({ items: [{ sitting: 2, votingNumber: 1 }] });
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
