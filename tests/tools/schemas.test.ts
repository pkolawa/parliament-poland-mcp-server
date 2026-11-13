import { z } from "zod";
import { tools } from "../../src/tools/index.js";
import { getProcessTool } from "../../src/tools/process.js";
import { getTranscriptsTool } from "../../src/tools/transcripts.js";
import { getCommitteeSittingsTool } from "../../src/tools/committees.js";
import { getInterpellationTextTool } from "../../src/tools/interpellations.js";
import { getActTextTool, searchActsTool } from "../../src/tools/acts.js";

const toolsWithOffset = Object.entries(tools).filter(
  ([, tool]) => "offset" in tool.schema
);

describe("tool input schemas", () => {
  it.each(toolsWithOffset)("%s accepts offset 0 and rejects negative offsets", (_name, tool) => {
    const schema = (tool.schema as Record<string, z.ZodType>).offset;

    expect(schema.safeParse(0).success).toBe(true);
    expect(schema.safeParse(-1).success).toBe(false);
  });

  it("get-process accepts plain and suffixed print numbers only", () => {
    const schema = z.object(getProcessTool.schema);

    expect(schema.safeParse({ term: 10, processNumber: "1070" }).success).toBe(true);
    expect(schema.safeParse({ term: 10, processNumber: "16168-z" }).success).toBe(true);
    expect(schema.safeParse({ term: 10, processNumber: "../MP" }).success).toBe(false);
  });

  it("get-transcripts requires a YYYY-MM-DD date", () => {
    const schema = z.object(getTranscriptsTool.schema);

    expect(schema.safeParse({ term: 10, proceeding: 1, date: "2023-11-13" }).success).toBe(true);
    expect(schema.safeParse({ term: 10, proceeding: 1, date: "13.11.2023" }).success).toBe(false);
  });

  it("path segments built from strings reject anything but plain codes", () => {
    const sittings = z.object(getCommitteeSittingsTool.schema);
    const text = z.object(getInterpellationTextTool.schema);

    expect(sittings.safeParse({ term: 10, code: "ASW" }).success).toBe(true);
    expect(sittings.safeParse({ term: 10, code: "../MP" }).success).toBe(false);
    expect(sittings.safeParse({ term: 10, code: "ASW", dateFrom: "2024-1-1" }).success).toBe(false);
    expect(text.safeParse({ term: 10, num: 10, replyKey: "CZLJNC" }).success).toBe(true);
    expect(text.safeParse({ term: 10, num: 10, replyKey: "a/b" }).success).toBe(false);
  });

  it("acts are identified by a known publisher and an article only by its number", () => {
    const text = z.object(getActTextTool.schema);
    const act = { publisher: "DU", year: 1964, position: 93 };

    expect(text.safeParse(act).success).toBe(true);
    expect(text.safeParse({ ...act, publisher: "../sejm" }).success).toBe(false);
    for (const article of ["415", "3a", "18^3a", "18_3_a", "22^1c"]) {
      expect(text.safeParse({ ...act, article }).success).toBe(true);
    }
    for (const article of ["../struct", "415/para=1", "art. 415", "18^3^a", ""]) {
      expect(text.safeParse({ ...act, article }).success).toBe(false);
    }
    expect(text.safeParse({ ...act, maxLength: 100_001 }).success).toBe(false);
  });

  it("search-acts requires YYYY-MM-DD dates and caps the limit", () => {
    const search = z.object(searchActsTool.schema);

    expect(search.safeParse({ dateEffectFrom: "2024-01-01", limit: 100 }).success).toBe(true);
    expect(search.safeParse({ dateEffectFrom: "2024-1-1" }).success).toBe(false);
    expect(search.safeParse({ limit: 101 }).success).toBe(false);
    expect(search.safeParse({ sortBy: "date" }).success).toBe(false);
  });
});
