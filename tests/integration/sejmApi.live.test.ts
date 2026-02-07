import { jest } from "@jest/globals";
import { makeSejmRequest } from "../../src/utils/api.js";
import { getMpsTool } from "../../src/tools/mps.js";
import { getTermsTool } from "../../src/tools/terms.js";

const runLiveApiTests = process.env.RUN_LIVE_API_TESTS === "true";
const liveDescribe = runLiveApiTests ? describe : describe.skip;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractTermNumber(terms: unknown[]): number | null {
  for (const term of terms) {
    if (!isObject(term)) {
      continue;
    }

    const candidates = [term.num, term.number, term.term, term.kadencja];
    for (const candidate of candidates) {
      if (typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0) {
        return candidate;
      }
      if (typeof candidate === "string" && /^\d+$/.test(candidate)) {
        return Number(candidate);
      }
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

    const termNumber = extractTermNumber((terms as unknown[]) ?? []);
    expect(termNumber).not.toBeNull();

    const mps = await makeSejmRequest<unknown>(`/term${termNumber}/MP`, { limit: 1 });
    expect(Array.isArray(mps)).toBe(true);
    expect((mps as unknown[]).length).toBeGreaterThan(0);
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
