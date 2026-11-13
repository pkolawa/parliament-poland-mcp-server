import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import {
  getActKeywordsTool,
  getActTextTool,
  getActTool,
  searchActsTool,
} from "../../src/tools/acts.js";

type MakeSejmRequestFn = (
  endpoint: string,
  params?: Record<string, unknown>,
  options?: Record<string, unknown>
) => Promise<unknown>;

jest.mock("../../src/utils/api.js", () => ({
  makeSejmRequest: jest.fn(),
}));

const makeSejmRequestMock =
  makeSejmRequest as jest.MockedFunction<MakeSejmRequestFn>;

const notFound = {
  ok: false,
  error: { status: 404, message: "HTTP 404 Not Found for /eli/acts/DU/1964/999999" },
};

function act(overrides: Record<string, unknown> = {}) {
  return {
    ELI: "DU/1964/93",
    address: "WDU19640160093",
    publisher: "DU",
    year: 1964,
    volume: 16,
    pos: 93,
    title: "Ustawa z dnia 23 kwietnia 1964 r. - Kodeks cywilny.",
    displayAddress: "Dz.U. 1964 nr 16 poz. 93",
    type: "Ustawa",
    status: "akt posiada tekst jednolity",
    inForce: "IN_FORCE",
    announcementDate: "1964-04-23",
    promulgation: "1964-05-18",
    entryIntoForce: "1965-01-01",
    changeDate: "2026-11-03T09:49:18",
    textHTML: true,
    textPDF: true,
    keywords: ["kodeks cywilny"],
    references: { "Przepisy wprowadzające": [{ id: "DU/1964/94" }] },
    ...overrides,
  };
}

beforeEach(() => {
  makeSejmRequestMock.mockReset();
});

describe("searchActsTool", () => {
  it("passes the filters to the ELI search and returns compact results", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: { totalCount: 1, offset: 0, count: 1, items: [act()] },
    });

    const result = await searchActsTool.handler({
      title: "kodeks cywilny",
      publisher: "DU",
      year: 1964,
      type: "Ustawa",
      keywords: ["kodeks cywilny", "cywilne prawo"],
      inForce: true,
      dateFrom: "1964-01-01",
      dateTo: "1964-12-31",
      sortBy: "title",
      sortDir: "asc",
    });

    expect(makeSejmRequestMock).toHaveBeenCalledWith(
      "/acts/search",
      {
        title: "kodeks cywilny",
        publisher: "DU",
        year: 1964,
        type: "Ustawa",
        keyword: "kodeks cywilny,cywilne prawo",
        inForce: "1",
        dateFrom: "1964-01-01",
        dateTo: "1964-12-31",
        sortBy: "title",
        sortDir: "asc",
        limit: 20,
      },
      { api: "eli" }
    );
    const text = result.content[0].text;
    expect(text).toContain("Found 1 legal acts:");
    expect(text).toContain('"ELI": "DU/1964/93"');
    expect(text).not.toContain("references");
    expect(text).not.toContain("keywords");
  });

  it("omits the in-force filter unless it is true and says how to get the next page", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: { totalCount: 61, offset: 20, count: 20, items: [] },
    });

    const result = await searchActsTool.handler({ title: "kodeks", inForce: false, offset: 20, limit: 20 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith(
      "/acts/search",
      { title: "kodeks", offset: 20, limit: 20, keyword: undefined, inForce: undefined },
      { api: "eli" }
    );
    expect(result.content[0].text).toContain("Found 61 legal acts; showing 21-40, pass offset=40 for more:");
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 503, message: "HTTP 503 Service Unavailable for /eli/acts/search" },
    });

    const result = await searchActsTool.handler({ title: "kodeks" });

    expect(result.content[0].text).toContain("Failed to search legal acts.");
    expect(result.content[0].text).toContain("Error: HTTP 503");
    expect(result.isError).toBe(true);
  });
});

describe("getActTool", () => {
  it("returns the details of an act with all references when there are few", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: act() });

    const result = await getActTool.handler({ publisher: "DU", year: 1964, position: 93 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/acts/DU/1964/93", undefined, { api: "eli" });
    const text = result.content[0].text;
    expect(text).toContain("Fetched legal act DU/1964/93 (Dz.U. 1964 nr 16 poz. 93):");
    expect(JSON.parse(text.slice(text.indexOf("{"))).references).toEqual({
      "Przepisy wprowadzające": [{ id: "DU/1964/94" }],
    });
  });

  it("summarizes many references with the newest of each type", async () => {
    const amending = Array.from({ length: 40 }, (_, i) => ({ id: `DU/${2000 + (i % 10)}/${i + 1}` }));
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: act({ references: { "Akty zmieniające": amending, "Przepisy wprowadzające": [{ id: "DU/1964/94" }] } }),
    });

    const result = await getActTool.handler({ publisher: "DU", year: 1964, position: 93 });

    const text = result.content[0].text;
    expect(text).toContain("The act has 41 references to other acts");
    expect(JSON.parse(text.slice(text.indexOf("{"))).references).toEqual({
      "Akty zmieniające": {
        count: 40,
        newest: [{ id: "DU/2009/40" }, { id: "DU/2009/30" }, { id: "DU/2009/20" }, { id: "DU/2009/10" }, { id: "DU/2008/39" }],
      },
      "Przepisy wprowadzające": { count: 1, newest: [{ id: "DU/1964/94" }] },
    });
  });

  it("returns every reference of the requested type", async () => {
    const amending = Array.from({ length: 40 }, (_, i) => ({ id: `DU/2000/${i + 1}` }));
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: act({ references: { "Akty zmieniające": amending } }) });

    const result = await getActTool.handler({
      publisher: "DU",
      year: 1964,
      position: 93,
      referenceType: "Akty zmieniające",
    });

    const text = result.content[0].text;
    expect(JSON.parse(text.slice(text.indexOf("{"))).references["Akty zmieniające"]).toHaveLength(40);
  });

  it("lists the available reference types when the requested one is missing", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: act() });

    const result = await getActTool.handler({ publisher: "DU", year: 1964, position: 93, referenceType: "Orzeczenie TK" });

    expect(result.content[0].text).toContain(
      'The act has no references of type "Orzeczenie TK"; its reference types are: Przepisy wprowadzające.'
    );
  });

  it("returns a failure message when the act does not exist", async () => {
    makeSejmRequestMock.mockResolvedValue(notFound);

    const result = await getActTool.handler({ publisher: "DU", year: 1964, position: 999999 });

    expect(result.content[0].text).toContain("Failed to fetch legal act DU/1964/999999.");
    expect(result.isError).toBe(true);
  });
});

const actHtml = `<html><body>
  <h1><span class="head-type">Ustawa</span><span class="head-date">z dnia 23 kwietnia 1964 r.</span></h1>
  <div class="unit unit_arti"><h3><b>Art.&nbsp;1.</b></h3><div class="unit-inner"><div>Pierwszy artykuł.</div></div></div>
  <div class="unit unit_arti"><h3><b>Art.&nbsp;2.</b></h3><div class="unit-inner">
    <div class="unit unit_para"><h3>§&nbsp;1.</h3><div>Drugi artykuł.</div></div>
  </div></div>
</body></html>`;

const structure = [
  {
    id: "part_1",
    type: "part",
    title: "Treść ustawy",
    children: [
      {
        id: "book_trzecia",
        type: "book",
        name: "trzecia",
        title: "Księga trzecia - Zobowiązania",
        children: [
          {
            id: "book_trzecia-titl_VI",
            type: "titl",
            name: "VI",
            title: "Tytuł VI - Czyny niedozwolone",
            children: [
              { id: "book_trzecia-titl_VI-arti_415", type: "arti", name: "415", title: "Art. 415." },
              { id: "book_trzecia-titl_VI-arti_18_3_a", type: "arti", name: "18_3_a", title: "Art. 18_3_a." },
            ],
          },
        ],
      },
    ],
  },
];

describe("getActTextTool", () => {
  it("returns the whole text of an act laid out as printed", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: actHtml });

    const result = await getActTextTool.handler({ publisher: "DU", year: 1964, position: 93 });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/acts/DU/1964/93/text.html", undefined, {
      api: "eli",
      format: "html",
      timeoutMs: 30_000,
    });
    expect(result.content[0].text).toBe(
      "Fetched the text of legal act DU/1964/93 (characters 0-89 of 89):\n\n" +
        "Ustawa\nz dnia 23 kwietnia 1964 r.\n\nArt. 1. Pierwszy artykuł.\n\nArt. 2. § 1. Drugi artykuł."
    );
  });

  it("truncates a long text at a line break and says where to continue", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: actHtml });

    const first = await getActTextTool.handler({ publisher: "DU", year: 1964, position: 93, maxLength: 70 });
    const second = await getActTextTool.handler({ publisher: "DU", year: 1964, position: 93, offset: 61, maxLength: 70 });

    expect(first.content[0].text).toBe(
      "Fetched the text of legal act DU/1964/93 (characters 0-61 of 89):\n\n" +
        "Ustawa\nz dnia 23 kwietnia 1964 r.\n\nArt. 1. Pierwszy artykuł." +
        "\n\n[Truncated: 28 more characters. Call again with offset=61 to continue or pass article to get a single article.]"
    );
    expect(second.content[0].text).toBe(
      "Fetched the text of legal act DU/1964/93 (characters 61-89 of 89):\n\nArt. 2. § 1. Drugi artykuł."
    );
  });

  it("rejects an offset beyond the end of the text", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: actHtml });

    const result = await getActTextTool.handler({ publisher: "DU", year: 1964, position: 93, offset: 89 });

    expect(result.content[0].text).toBe(
      "Offset 89 is beyond the end of the text of legal act DU/1964/93, which has 89 characters."
    );
    expect(result.isError).toBe(true);
  });

  it("points to the PDF when the act has no HTML text", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: "" });

    const result = await getActTextTool.handler({ publisher: "MP", year: 2023, position: 1261 });

    expect(result.content[0].text).toBe(
      "Legal act MP/2023/1261 has no HTML text in the ELI API; its text is only in the PDF: " +
        "https://api.sejm.gov.pl/eli/acts/MP/2023/1261/text.pdf"
    );
    expect(result.isError).toBeUndefined();
  });

  it("finds an article in the structure of the act and fetches only its fragment", async () => {
    makeSejmRequestMock
      .mockResolvedValueOnce({ ok: true, data: structure })
      .mockResolvedValueOnce({
        ok: true,
        data: '<div class="unit unit_arti"><h3><b>Art.&nbsp;18<SUP>3</SUP><SUP>a</SUP>.</b></h3><div>Treść.</div></div>',
      });

    const result = await getActTextTool.handler({ publisher: "DU", year: 1964, position: 93, article: "18^3a" });

    expect(makeSejmRequestMock).toHaveBeenNthCalledWith(1, "/acts/DU/1964/93/struct", undefined, { api: "eli" });
    expect(makeSejmRequestMock).toHaveBeenNthCalledWith(
      2,
      "/acts/DU/1964/93/text.html/book=trzecia/titl=VI/arti=18_3_a",
      undefined,
      { api: "eli", format: "html" }
    );
    expect(result.content[0].text).toBe(
      "Fetched the text of article 18^3a of legal act DU/1964/93 (characters 0-97 of 97):\n\n" +
        "[Treść ustawy > Księga trzecia - Zobowiązania > Tytuł VI - Czyny niedozwolone]\nArt. 18^3a. Treść."
    );
  });

  it("returns every occurrence of an article number with its location", async () => {
    const quoted = [
      { id: "part_1", type: "part", title: "Treść obwieszczenia", children: [
        { id: "pass_2", type: "pass", name: "2", title: "2.", children: [{ id: "pass_2-arti_46", type: "arti", name: "46" }] },
      ] },
      { id: "part_2", type: "part", title: "Załącznik", children: [{ id: "arti_46", type: "arti", name: "46" }] },
    ];
    makeSejmRequestMock
      .mockResolvedValueOnce({ ok: true, data: quoted })
      .mockResolvedValueOnce({ ok: true, data: "<h3>Art. 46.</h3><div>Cytowany.</div>" })
      .mockResolvedValueOnce({ ok: true, data: "<h3>Art. 46.</h3><div>(uchylony)</div>" });

    const result = await getActTextTool.handler({ publisher: "DU", year: 2023, position: 1465, article: "46" });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/acts/DU/2023/1465/text.html/pass=2/arti=46", undefined, { api: "eli", format: "html" });
    expect(makeSejmRequestMock).toHaveBeenCalledWith("/acts/DU/2023/1465/text.html/arti=46", undefined, { api: "eli", format: "html" });
    expect(result.content[0].text).toContain(
      "[Treść obwieszczenia > 2.]\nArt. 46. Cytowany.\n\n[Załącznik]\nArt. 46. (uchylony)"
    );
  });

  it("lists the articles of the act when the requested one does not exist", async () => {
    makeSejmRequestMock.mockResolvedValueOnce({ ok: true, data: structure });

    const result = await getActTextTool.handler({ publisher: "DU", year: 1964, position: 93, article: "9999" });

    expect(makeSejmRequestMock).toHaveBeenCalledTimes(1);
    expect(result.content[0].text).toBe(
      "Article 9999 was not found in legal act DU/1964/93. The act has 2 articles: 415, 18^3a"
    );
    expect(result.isError).toBe(true);
  });

  it("points to the PDF when an article is requested from an act without an HTML text", async () => {
    makeSejmRequestMock
      .mockResolvedValueOnce({ ok: false, error: { status: 404, message: "HTTP 404 Not Found for /eli/acts/MP/2023/1261/struct" } })
      .mockResolvedValueOnce({ ok: true, data: act({ textHTML: false }) });

    const result = await getActTextTool.handler({ publisher: "MP", year: 2023, position: 1261, article: "1" });

    expect(makeSejmRequestMock).toHaveBeenLastCalledWith("/acts/MP/2023/1261", undefined, { api: "eli" });
    expect(result.content[0].text).toContain("Legal act MP/2023/1261 has no HTML text in the ELI API");
  });

  it("returns a failure message when the act does not exist", async () => {
    makeSejmRequestMock.mockResolvedValue(notFound);

    const whole = await getActTextTool.handler({ publisher: "DU", year: 1964, position: 999999 });
    const article = await getActTextTool.handler({ publisher: "DU", year: 1964, position: 999999, article: "1" });

    expect(whole.content[0].text).toContain("Failed to fetch the text of legal act DU/1964/999999.");
    expect(whole.isError).toBe(true);
    expect(article.content[0].text).toContain("Failed to fetch the structure of legal act DU/1964/999999.");
    expect(article.isError).toBe(true);
  });
});

describe("getActKeywordsTool", () => {
  const keywords = ["kodeks cywilny", "odnawialne źródła energii", "Służba Cywilna", "podatki"];

  it("filters keywords ignoring case and Polish diacritics", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: keywords });

    const cywil = await getActKeywordsTool.handler({ query: "CYWIL" });
    const zrodla = await getActKeywordsTool.handler({ query: "zrodla" });

    expect(makeSejmRequestMock).toHaveBeenCalledWith("/keywords", undefined, { api: "eli" });
    expect(cywil.content[0].text).toBe(
      'Found 2 keywords of legal acts matching "CYWIL":\n\nkodeks cywilny\nSłużba Cywilna'
    );
    expect(zrodla.content[0].text).toContain("odnawialne źródła energii");
  });

  it("lists every keyword without a query", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: keywords });

    const result = await getActKeywordsTool.handler({});

    expect(result.content[0].text).toContain("Found 4 keywords of legal acts:");
  });

  it("returns a failure message when the API fails", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: false, error: { message: "Request to /eli/keywords timed out after 15s" } });

    const result = await getActKeywordsTool.handler({ query: "podat" });

    expect(result.content[0].text).toContain("Failed to fetch the keywords of legal acts.");
    expect(result.isError).toBe(true);
  });
});
