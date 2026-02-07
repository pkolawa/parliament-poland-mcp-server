import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getMpsTool } from "../../src/tools/mps.js";
import { getTermsTool } from "../../src/tools/terms.js";

const runLiveApiTests = process.env.RUN_LIVE_API_TESTS === "true";
const liveDescribe = runLiveApiTests ? describe : describe.skip;

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
  params: Record<string, unknown>,
  maxTerms = 5
): Promise<{ term: number; results: unknown[] } | null> {
  const termNumbers = extractTermNumbers(terms);
  const candidates = termNumbers.slice(0, maxTerms);

  for (const term of candidates) {
    const result = await makeSejmRequest<unknown>(endpoint(term), params);
    if (Array.isArray(result) && result.length > 0) {
      return { term, results: result as unknown[] };
    }
  }

  return null;
}

liveDescribe("Sejm API live integration", () => {
  jest.setTimeout(30_000);

  it("returns a non-empty list of terms", async () => {
    const terms = await makeSejmRequest<unknown>("/term");

    expect(Array.isArray(terms)).toBe(true);
    expect((terms as unknown[]).length).toBeGreaterThan(0);
  });

  it("returns MPs for an existing term", async () => {
    const terms = await makeSejmRequest<unknown>("/term");
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
    const terms = await makeSejmRequest<unknown>("/term");
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
    const terms = await makeSejmRequest<unknown>("/term");
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
    const terms = await makeSejmRequest<unknown>("/term");
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
    const terms = await makeSejmRequest<unknown>("/term");
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
    const terms = await makeSejmRequest<unknown>("/term");
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
      const result = await makeSejmRequest<unknown>(
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
    expect(text).toContain("Fetched the list of Sejm terms:");
  });

  it("MPs MCP tool returns success text for live API", async () => {
    const terms = await makeSejmRequest<unknown>("/term");
    expect(Array.isArray(terms)).toBe(true);

    const termNumber = extractTermNumber((terms as unknown[]) ?? []);
    expect(termNumber).not.toBeNull();

    const result = await getMpsTool.handler({ term: Number(termNumber), limit: 1 });
    const text = result.content[0]?.text ?? "";

    expect(text.includes("Failed to fetch")).toBe(false);
    expect(text).toContain(`Fetched the list of MPs for term ${termNumber}:`);
  });
});
