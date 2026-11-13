import { jest } from "@jest/globals";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { makeSejmRequest } from "../../src/utils/api.js";
import { server } from "../../src/server.js";
import { tools } from "../../src/tools/index.js";
import { getMpsTool } from "../../src/tools/mps.js";
import { getTermsTool } from "../../src/tools/terms.js";
import { getBilateralGroupsTool } from "../../src/tools/bilateralGroups.js";
import { getProcessTool } from "../../src/tools/process.js";
import { getTranscriptsTool } from "../../src/tools/transcripts.js";
import { getWrittenQuestionsTool } from "../../src/tools/writtenQuestions.js";
import { getVotingsTool, getVotingTool, searchVotingsTool } from "../../src/tools/votings.js";
import { getMpVotingStatsTool, getMpVotingsTool } from "../../src/tools/mpVotings.js";
import { getPassedProcessesTool } from "../../src/tools/processes.js";
import { getCurrentProceedingTool } from "../../src/tools/proceedings.js";
import { getStatementTool } from "../../src/tools/transcripts.js";
import { getCommitteeSittingsTool, getCommitteeSittingTool } from "../../src/tools/committees.js";
import { getInterpellationTextTool } from "../../src/tools/interpellations.js";
import { getVideosByDateTool } from "../../src/tools/videos.js";

const runLiveApiTests = process.env.RUN_LIVE_API_TESTS === "true";
const liveDescribe = runLiveApiTests ? describe : describe.skip;

async function fetchData(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<unknown> {
  const result = await makeSejmRequest<unknown>(endpoint, params);
  return result.ok ? result.data : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractTermNumbers(terms: unknown[]): number[] {
  const results: number[] = [];
  const seen = new Set<number>();

  for (const term of terms) {
    if (!isObject(term)) {
      continue;
    }

    const candidates = [term.num, term.number, term.term, term.kadencja];
    for (const candidate of candidates) {
      let value: number | null = null;
      if (typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0) {
        value = candidate;
      } else if (typeof candidate === "string" && /^\d+$/.test(candidate)) {
        value = Number(candidate);
      }

      if (value !== null && !seen.has(value)) {
        seen.add(value);
        results.push(value);
      }
    }
  }

  return results.sort((a, b) => b - a);
}

function extractTermNumber(terms: unknown[]): number | null {
  const numbers = extractTermNumbers(terms);
  return numbers.length > 0 ? numbers[0] : null;
}

function extractProceedingNumbers(proceedings: unknown[]): number[] {
  const results: number[] = [];
  const seen = new Set<number>();

  for (const proceeding of proceedings) {
    if (!isObject(proceeding)) {
      continue;
    }

    const candidates = [
      proceeding.num,
      proceeding.number,
      proceeding.sitting,
      proceeding.sittingNumber,
      proceeding.posiedzenie,
    ];

    for (const candidate of candidates) {
      let value: number | null = null;
      if (typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0) {
        value = candidate;
      } else if (typeof candidate === "string" && /^\d+$/.test(candidate)) {
        value = Number(candidate);
      }

      if (value !== null && !seen.has(value)) {
        seen.add(value);
        results.push(value);
      }
    }
  }
  return results;
}

async function findFirstTermWithResults(
  terms: unknown[],
  endpoint: (term: number) => string,
  params: Record<string, string | number | boolean | undefined>,
  maxTerms = 5
): Promise<{ term: number; results: unknown[] } | null> {
  const termNumbers = extractTermNumbers(terms);
  const candidates = termNumbers.slice(0, maxTerms);

  for (const term of candidates) {
    const result = await fetchData(endpoint(term), params);
    if (Array.isArray(result) && result.length > 0) {
      return { term, results: result as unknown[] };
    }
  }

  return null;
}

async function currentTerm(): Promise<number> {
  const terms = await fetchData("/term");
  const termNumber = extractTermNumber(Array.isArray(terms) ? terms : []);
  if (termNumber === null) {
    throw new Error("The API returned no terms.");
  }
  return termNumber;
}

function expectToolSuccess(
  result: { content: { text: string }[]; isError?: boolean },
  successText: string
) {
  const text = result.content[0]?.text ?? "";
  expect(result.isError).toBeUndefined();
  expect(text).toContain(successText);
}

liveDescribe("Sejm API live integration", () => {
  jest.setTimeout(30_000);

  it("returns a non-empty list of terms", async () => {
    const terms = await fetchData("/term");

    expect(Array.isArray(terms)).toBe(true);
    expect((terms as unknown[]).length).toBeGreaterThan(0);
  });

  it("returns MPs for an existing term", async () => {
    const terms = await fetchData("/term");
    expect(Array.isArray(terms)).toBe(true);

    const result = await findFirstTermWithResults(
      (terms as unknown[]) ?? [],
      (termNumber) => `/term${termNumber}/MP`,
      { limit: 1 }
    );

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("No term returned a non-empty list of MPs.");
    }
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("returns committees for an existing term", async () => {
    const terms = await fetchData("/term");
    expect(Array.isArray(terms)).toBe(true);

    const result = await findFirstTermWithResults(
      (terms as unknown[]) ?? [],
      (termNumber) => `/term${termNumber}/committees`,
      { limit: 1 }
    );

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("No term returned a non-empty list of committees.");
    }
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("returns clubs for an existing term", async () => {
    const terms = await fetchData("/term");
    expect(Array.isArray(terms)).toBe(true);

    const result = await findFirstTermWithResults(
      (terms as unknown[]) ?? [],
      (termNumber) => `/term${termNumber}/clubs`,
      { limit: 1 }
    );

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("No term returned a non-empty list of clubs.");
    }
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("returns prints for an existing term", async () => {
    const terms = await fetchData("/term");
    expect(Array.isArray(terms)).toBe(true);

    const result = await findFirstTermWithResults(
      (terms as unknown[]) ?? [],
      (termNumber) => `/term${termNumber}/prints`,
      { limit: 1 }
    );

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("No term returned a non-empty list of prints.");
    }
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("returns proceedings for an existing term", async () => {
    const terms = await fetchData("/term");
    expect(Array.isArray(terms)).toBe(true);

    const result = await findFirstTermWithResults(
      (terms as unknown[]) ?? [],
      (termNumber) => `/term${termNumber}/proceedings`,
      { limit: 1 }
    );

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("No term returned a non-empty list of proceedings.");
    }
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("returns votings for an existing proceeding", async () => {
    const terms = await fetchData("/term");
    expect(Array.isArray(terms)).toBe(true);

    const proceedingsResult = await findFirstTermWithResults(
      (terms as unknown[]) ?? [],
      (termNumber) => `/term${termNumber}/proceedings`,
      { limit: 5 }
    );

    expect(proceedingsResult).not.toBeNull();
    if (!proceedingsResult) {
      throw new Error("No term returned a non-empty list of proceedings.");
    }

    const proceedingNumbers = extractProceedingNumbers(
      (proceedingsResult.results as unknown[]) ?? []
    );
    expect(proceedingNumbers.length).toBeGreaterThan(0);

    let votings: unknown[] | null = null;
    for (const proceedingNumber of proceedingNumbers.slice(0, 5)) {
      const result = await fetchData(
        `/term${proceedingsResult.term}/votings/${proceedingNumber}`,
        { limit: 1 }
      );

      if (Array.isArray(result) && result.length > 0) {
        votings = result as unknown[];
        break;
      }
    }

    expect(votings).not.toBeNull();
  });

  it("terms MCP tool returns success text for live API", async () => {
    const result = await getTermsTool.handler({ limit: 1 });
    const text = result.content[0]?.text ?? "";

    expect(text.includes("Failed to fetch")).toBe(false);
    expect(text).toMatch(/^Fetched 1 of \d+ Sejm terms \(offset 0; pass offset=1 for the next page\):/);
  });

  it("MPs MCP tool returns success text for live API", async () => {
    const terms = await fetchData("/term");
    expect(Array.isArray(terms)).toBe(true);

    const termNumber = extractTermNumber((terms as unknown[]) ?? []);
    expect(termNumber).not.toBeNull();

    const result = await getMpsTool.handler({ term: Number(termNumber), limit: 1 });
    const text = result.content[0]?.text ?? "";

    expect(text.includes("Failed to fetch")).toBe(false);
    expect(text).toMatch(new RegExp(`^Fetched 1 of \\d+ MPs of term ${termNumber} \\(offset 0; pass offset=1`));
  });

  it("bilateral groups MCP tool returns success text for live API", async () => {
    const term = await currentTerm();

    const result = await getBilateralGroupsTool.handler({ term });

    expectToolSuccess(result, `Fetched the list of bilateral groups for term ${term}:`);
  });

  it("written questions MCP tool returns success text for live API", async () => {
    const term = await currentTerm();

    const result = await getWrittenQuestionsTool.handler({ term, limit: 1 });

    expectToolSuccess(result, `Fetched the list of written questions for term ${term}:`);
  });

  it("process MCP tool returns success text for live API", async () => {
    const term = await currentTerm();
    const processes = await fetchData(`/term${term}/processes`, { limit: 1 });
    const first = Array.isArray(processes) ? processes[0] : null;
    if (!isObject(first) || typeof first.number !== "string") {
      throw new Error(`No legislative process found in term ${term}.`);
    }

    const result = await getProcessTool.handler({ term, processNumber: first.number });

    expectToolSuccess(result, `Fetched process ${first.number} for term ${term}:`);
  });

  it("transcripts MCP tool returns success text for live API", async () => {
    const term = await currentTerm();
    const proceedings = await fetchData(`/term${term}/proceedings`);
    const sitting = (Array.isArray(proceedings) ? proceedings : []).find(
      (p): p is { number: number; dates: string[] } =>
        isObject(p) && typeof p.number === "number" && p.number > 0 &&
        Array.isArray(p.dates) && p.dates.length > 0
    );
    if (!sitting) {
      throw new Error(`No sitting with dates found in term ${term}.`);
    }

    const result = await getTranscriptsTool.handler({
      term,
      proceeding: sitting.number,
      date: sitting.dates[0],
    });

    expectToolSuccess(
      result,
      `Fetched the transcript statements for sitting ${sitting.number} on ${sitting.dates[0]} in term ${term}:`
    );
  });

  // The API returns these lists whole; the tools filter and paginate them.
  it("get-members filters and paginates the MPs of a term", async () => {
    const page = (await getMpsTool.handler({ term: 10, club: "Lewica", limit: 3, fields: ["profession"] }))
      .structuredContent as { total: number; nextOffset?: number; items: Record<string, unknown>[] };
    const holownia = (await getMpsTool.handler({ term: 10, name: "holownia szymon" })).structuredContent as {
      items: { id: number; firstLastName: string }[];
    };

    expect(page.total).toBeGreaterThan(3);
    expect(page.nextOffset).toBe(3);
    expect(page.items).toHaveLength(3);
    expect(page.items.every((mp) => mp.club === "Lewica" && "profession" in mp && !("email" in mp))).toBe(true);
    expect(holownia.items.map((mp) => mp.firstLastName)).toEqual(["Szymon Hołownia"]);
  });

  it("get-votings filters and paginates the votings of a sitting", async () => {
    // Sitting 1 of the 10th term: 8 votings on its first day, 2023-11-13.
    const firstDay = (await getVotingsTool.handler({ term: 10, proceeding: 1, date: "2023-11-13" }))
      .structuredContent as { total: number; items: { votingNumber: number; date: string }[] };
    const all = (await getVotingsTool.handler({ term: 10, proceeding: 1, limit: 10 })).structuredContent as {
      total: number;
      nextOffset?: number;
      items: unknown[];
    };
    const marshal = (await getVotingsTool.handler({ term: 10, proceeding: 1, title: "wybor marszalka" }))
      .structuredContent as { items: { votingNumber: number }[] };

    expect(firstDay.total).toBe(8);
    expect(firstDay.items.every((v) => v.date.startsWith("2023-11-13"))).toBe(true);
    expect(all.total).toBeGreaterThan(100);
    expect(all.items).toHaveLength(10);
    expect(all.nextOffset).toBe(10);
    expect(marshal.items.map((v) => v.votingNumber)).toContain(1);
  });

  // Historical records of the 10th term (first sitting on 2023-11-13) that will not change.
  it.each([
    ["get-voting", () => getVotingTool.handler({ term: 10, sitting: 1, votingNumber: 1 }), "votesByClub"],
    ["search-votings", () => searchVotingsTool.handler({ term: 10, title: "Marszałka", limit: 1 }), "Found 1 votings"],
    ["get-mp-voting-stats", () => getMpVotingStatsTool.handler({ term: 10, id: 1 }), "numVotings"],
    ["get-mp-votings", () => getMpVotingsTool.handler({ term: 10, id: 1, sitting: 1, date: "2023-11-13" }), "votingNumber"],
    ["get-passed-processes", () => getPassedProcessesTool.handler({ term: 10, limit: 1 }), "Fetched the list of passed processes"],
    ["get-current-proceeding", () => getCurrentProceedingTool.handler({ term: 10 }), "Fetched the current sitting"],
    ["get-statement", () => getStatementTool.handler({ term: 10, proceeding: 1, date: "2023-11-13", statementNum: 1 }), "Andrzej Duda"],
    ["get-committee-sittings", () => getCommitteeSittingsTool.handler({ term: 10, code: "ASW", dateTo: "2023-11-30" }), "Wybór Prezydium"],
    ["get-committee-sitting", () => getCommitteeSittingTool.handler({ term: 10, code: "ASW", num: 1 }), "Wybór Prezydium"],
    ["get-interpellation-text", () => getInterpellationTextTool.handler({ term: 10, num: 10 }), "Interpelacja nr 10"],
    ["get-interpellation-text (reply)", () => getInterpellationTextTool.handler({ term: 10, num: 10, replyKey: "CZLJNC" }), "Odpowiedź na interpelację nr 10"],
    ["get-videos-by-date", () => getVideosByDateTool.handler({ term: 10, date: "2023-11-13" }), "playerLink"],
  ] as const)("%s MCP tool returns success text for live API", async (_name, call, expected) => {
    const result = await call();

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain(expected);
    expect(result.content[0].text).not.toMatch(/<\/?(p|div|html)\b/);
  });
  // Every tool through the MCP protocol, so the SDK validates the structured content of live
  // responses against the output schemas (on the server and again in the client).
  describe("every tool through MCP", () => {
    const client = new Client({ name: "live-test", version: "1.0.0" });

    beforeAll(async () => {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    });

    afterAll(async () => {
      await client.close();
    });

    // Historical records of the 10th term; `term` is omitted in a few calls to use the current term.
    const calls: Record<keyof typeof tools, Record<string, unknown>> = {
      "get-terms": {},
      "get-members": { club: "KO", active: true, limit: 5, fields: ["profession", "birthDate"] },
      "get-member": { term: 10, id: 1 },
      "get-mp-voting-stats": { term: 10, id: 1 },
      "get-mp-votings": { term: 10, id: 1, sitting: 1, date: "2023-11-13" },
      "get-clubs": { term: 10 },
      "get-club": { term: 10, id: "KO" },
      "get-committees": { term: 10 },
      "get-committee": { term: 10, id: "ASW" },
      "get-committee-sittings": { term: 10, code: "ASW", dateTo: "2023-11-30" },
      "get-committee-sitting": { term: 10, code: "ASW", num: 1 },
      "get-interpellations": { term: 10, limit: 3 },
      "get-interpellation": { term: 10, id: 10 },
      "get-interpellation-text": { term: 10, num: 10 },
      "get-prints": { term: 10, limit: 3 },
      "get-print": { term: 10, printNumber: "2" },
      "get-proceedings": { term: 10 },
      "get-proceeding": { term: 10, proceeding: 1 },
      "get-current-proceeding": {},
      "get-process": { term: 10, processNumber: "2" },
      "get-processes": { term: 10, limit: 3 },
      "get-passed-processes": { term: 10, limit: 3 },
      "get-transcripts": { term: 10, proceeding: 1, date: "2023-11-13" },
      "get-statement": { term: 10, proceeding: 1, date: "2023-11-13", statementNum: 1 },
      "get-videos": { term: 10, limit: 3 },
      "get-videos-by-date": { term: 10, date: "2023-11-13" },
      "get-votings": { term: 10, proceeding: 1, date: "2023-11-13" },
      "get-voting": { term: 10, sitting: 1, votingNumber: 1, includeVotes: true },
      "search-votings": { term: 10, title: "Marszałka", limit: 3 },
      "get-written-questions": { term: 10, limit: 3 },
      "get-bilateral-groups": {},
    };

    it.each(Object.entries(calls))("%s returns valid data", async (name, args) => {
      const result = await client.callTool({ name, arguments: args });
      const [content] = result.content as { type: string; text: string }[];

      expect([name, result.isError ?? false, content.text.slice(0, 300)]).toEqual([name, false, expect.any(String)]);
      if (tools[name as keyof typeof tools].outputSchema) {
        expect(result.structuredContent).toBeDefined();
      }
    });

    async function items(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>[]> {
      const result = await client.callTool({ name, arguments: args });
      expect([name, result.isError ?? false]).toEqual([name, false]);
      return (result.structuredContent as { items: Record<string, unknown>[] }).items;
    }

    // The spec lists offset and limit for only some endpoints; every tool that takes them must honour them.
    const paginated = (Object.keys(calls) as (keyof typeof tools)[]).filter(
      (name) => "limit" in tools[name].schema && "offset" in tools[name].schema
    );

    it.each(paginated)("%s honours offset and limit", async (name) => {
      const base = { ...calls[name], offset: undefined, limit: undefined };
      const firstThree = await items(name, { ...base, limit: 3 });
      const second = await items(name, { ...base, offset: 1, limit: 1 });

      expect(firstThree).toHaveLength(3);
      expect(second).toEqual([firstThree[1]]);
    });

    it("get-interpellations filters by MP, recipient, dates and delay", async () => {
      const [sample] = await items("get-interpellations", { term: 10, limit: 1 });
      const mp = Number((sample.from as string[])[0]);
      const recipient = (sample.to as string[])[0];

      const byMp = await items("get-interpellations", { term: 10, mp, limit: 20 });
      const byRecipient = await items("get-interpellations", { term: 10, recipient, limit: 20 });
      const byDate = await items("get-interpellations", {
        term: 10,
        dateFrom: "2024-03-01",
        dateTo: "2024-03-31",
        limit: 20,
      });
      const delayed = await items("get-interpellations", { term: 10, delayed: true, limit: 20 });

      expect(byMp.length).toBeGreaterThan(0);
      expect(byMp.every((i) => (i.from as string[]).includes(String(mp)))).toBe(true);
      expect(byRecipient.length).toBeGreaterThan(0);
      expect(byRecipient.every((i) => (i.to as string[]).includes(recipient))).toBe(true);
      expect(byDate.length).toBeGreaterThan(0);
      expect(byDate.every((i) => String(i.sentDate) >= "2024-03-01" && String(i.sentDate) < "2024-04-01")).toBe(true);
      expect(delayed.length).toBeGreaterThan(0);
      expect(delayed.every((i) => Number(i.answerDelayedDays) > 0)).toBe(true);
    });

    it("get-proceeding returns the agenda of one sitting as text", async () => {
      const result = await client.callTool({ name: "get-proceeding", arguments: { term: 10, proceeding: 1 } });
      const sitting = result.structuredContent as { number: number; dates: string[]; agenda: string };

      expect(sitting.number).toBe(1);
      expect(sitting.dates[0]).toBe("2023-11-13");
      expect(sitting.agenda).toContain("Ślubowanie");
      expect(sitting.agenda).not.toMatch(/<\/?(p|div|li)\b/);
    });
  });
});
