import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { MP_PAGE_SIZE, getMpTool, getMpsTool } from "../../src/tools/mps.js";

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

describe("getMpsTool", () => {
  const mps = [
    {
      id: 1,
      firstLastName: "Andrzej Adamczyk",
      firstName: "Andrzej",
      secondName: "Mieczysław",
      lastName: "Adamczyk",
      club: "PiS",
      districtNum: 13,
      districtName: "Kraków",
      voivodeship: "małopolskie",
      active: true,
      profession: "ekonomista",
      birthDate: "1959-01-04",
      email: "Andrzej.Adamczyk@sejm.pl",
    },
    {
      id: 2,
      firstLastName: "Szymon Hołownia",
      secondName: "Franciszek",
      club: "Polska2050-TD",
      districtNum: 19,
      districtName: "Warszawa",
      voivodeship: "mazowieckie",
      active: true,
      profession: "dziennikarz",
    },
    {
      id: 3,
      firstLastName: "Bartosz Arłukowicz",
      club: "KO",
      districtNum: 41,
      districtName: "Szczecin",
      voivodeship: "zachodniopomorskie",
      active: false,
      inactiveCause: "Zrzeczenie",
    },
    {
      id: 4,
      firstLastName: "Anna Kowalska",
      club: "KO",
      districtNum: 26,
      districtName: "Słupsk",
      voivodeship: "pomorskie",
      active: true,
    },
    {
      id: 5,
      firstLastName: "Jan Nowak",
      club: "KO",
      districtNum: 12,
      districtName: "Kraków",
      voivodeship: "małopolskie",
      active: true,
    },
  ];

  function parsed(text: string) {
    return JSON.parse(text.slice(text.indexOf("\n\n") + 2));
  }

  async function ids(args: Parameters<typeof getMpsTool.handler>[0]) {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: mps });
    const result = await getMpsTool.handler({ term: 10, ...args });
    return parsed(result.content[0].text).items.map((mp: { id: number }) => mp.id);
  }

  it("fetches the whole list without passing offset or limit to the API", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: mps });

    await getMpsTool.handler({ term: 10, offset: 1, limit: 2 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/MP");
  });

  it("returns a summary of each MP with the total and the offset of the next page", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: mps });

    const result = await getMpsTool.handler({ term: 10, limit: 2 });

    expect(result.content[0].text).toMatch(
      /^Fetched 2 of 5 MPs of term 10 \(offset 0; pass offset=2 for the next page\):\n\n/
    );
    const data = parsed(result.content[0].text);
    expect(data).toMatchObject({ total: 5, offset: 0, nextOffset: 2 });
    expect(data.items[0]).toEqual({
      id: 1,
      firstLastName: "Andrzej Adamczyk",
      club: "PiS",
      districtNum: 13,
      districtName: "Kraków",
      voivodeship: "małopolskie",
      active: true,
    });
    expect(result.structuredContent).toEqual(data);
  });

  it("paginates after filtering", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: mps });

    const result = await getMpsTool.handler({ term: 10, club: "KO", offset: 1, limit: 1 });

    expect(result.content[0].text).toContain(
      "Fetched 1 of 3 MPs of term 10 matching club=KO (offset 1; pass offset=2 for the next page):"
    );
    expect(parsed(result.content[0].text).items.map((mp: { id: number }) => mp.id)).toEqual([4]);
  });

  it(`returns ${MP_PAGE_SIZE} MPs by default`, async () => {
    const many = Array.from({ length: MP_PAGE_SIZE + 20 }, (_, i) => ({ id: i + 1, club: "KO" }));
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: many });

    const result = await getMpsTool.handler({ term: 10 });

    const data = parsed(result.content[0].text);
    expect(data.items).toHaveLength(MP_PAGE_SIZE);
    expect(data.nextOffset).toBe(MP_PAGE_SIZE);
  });

  it("filters by club, ignoring case", async () => {
    expect(await ids({ club: "ko" })).toEqual([3, 4, 5]);
    expect(await ids({ club: "polska2050-td" })).toEqual([2]);
  });

  it("lists the club IDs when no MP is in the club", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: mps });

    const result = await getMpsTool.handler({ term: 10, club: "Polska 2050" });

    expect(result.content[0].text).toContain(
      "Fetched no MPs of term 10 matching club=Polska 2050 (club IDs in term 10: KO, PiS, Polska2050-TD):"
    );
    expect(result.isError).toBeUndefined();
  });

  it("filters by name words in any order, ignoring case and diacritics", async () => {
    expect(await ids({ name: "holownia" })).toEqual([2]);
    expect(await ids({ name: "Hołownia Szymon" })).toEqual([2]);
    expect(await ids({ name: "Szymon Franciszek Hołownia" })).toEqual([2]);
    expect(await ids({ name: "Szymon Kowalski" })).toEqual([]);
  });

  it("filters by whether the mandate is held", async () => {
    expect(await ids({ active: false })).toEqual([3]);
    expect(await ids({ active: true })).toEqual([1, 2, 4, 5]);
  });

  it("filters by district number or name", async () => {
    expect(await ids({ district: "13" })).toEqual([1]);
    expect(await ids({ district: "krakow" })).toEqual([1, 5]);
    expect(await ids({ district: "Słupsk" })).toEqual([4]);
  });

  it("filters by voivodeship from the start of its name", async () => {
    expect(await ids({ voivodeship: "pomorskie" })).toEqual([4]);
    expect(await ids({ voivodeship: "Województwo Małopolskie" })).toEqual([1, 5]);
    expect(await ids({ voivodeship: "mazow" })).toEqual([2]);
  });

  it("combines filters", async () => {
    expect(await ids({ club: "KO", district: "Kraków", active: true })).toEqual([5]);
  });

  it("adds the requested fields to the summary", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: mps });

    const result = await getMpsTool.handler({ term: 10, name: "Adamczyk", fields: ["profession", "birthDate"] });

    expect(parsed(result.content[0].text).items[0]).toEqual({
      id: 1,
      firstLastName: "Andrzej Adamczyk",
      club: "PiS",
      districtNum: 13,
      districtName: "Kraków",
      voivodeship: "małopolskie",
      active: true,
      profession: "ekonomista",
      birthDate: "1959-01-04",
    });
  });

  it("prefixes the data with the notice when it comes from the cache", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: [{ id: 1 }],
      notice: "Note: the Sejm API is currently unavailable.\n\n",
    });

    const result = await getMpsTool.handler({ term: 10 });

    expect(result.content[0].text).toMatch(
      /^Note: the Sejm API is currently unavailable\.\n\nFetched 1 MPs of term 10:/
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getMpsTool.handler({ term: 10 });

    expect(result.content[0].text).toContain(
      "Failed to fetch the list of MPs for term 10"
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});

describe("getMpTool", () => {
  it("returns a success message with data", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: { id: 1, name: "Test" } });

    const result = await getMpTool.handler({ term: 10, id: 1 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/term10/MP/1");
    expect(result.content[0].text).toContain(
      "Fetched information about the MP with ID 1 in term 10:"
    );
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/test" },
    });

    const result = await getMpTool.handler({ term: 10, id: 1 });

    expect(result.content[0].text).toContain(
      "Failed to fetch information about the MP with ID 1 in term 10."
    );
    expect(result.content[0].text).toContain("Error: HTTP 404 Not Found");
    expect(result.isError).toBe(true);
  });
});
