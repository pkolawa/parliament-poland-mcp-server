import { z } from "zod";
import { tools } from "../../src/tools/index.js";
import { getProcessTool } from "../../src/tools/process.js";
import { getTranscriptsTool } from "../../src/tools/transcripts.js";
import { getCommitteeSittingsTool } from "../../src/tools/committees.js";
import { getInterpellationTextTool } from "../../src/tools/interpellations.js";

const toolsWithOffset = Object.entries(tools).filter(
  ([, tool]) => "offset" in tool.schema
);

describe("tool input schemas", () => {
  it.each(toolsWithOffset)("%s accepts offset 0 and rejects negative offsets", (_name, tool) => {
    const schema = (tool.schema as z.ZodRawShape).offset;

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
});
