import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import type { StatementList } from "../types/api.js";

export const getTranscriptsTool = {
  description: "Get the list of transcript statements for a Sejm sitting day",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    proceeding: z.number().int().positive().describe("Sejm sitting number"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date in YYYY-MM-DD format")
      .describe("Day of the sitting in YYYY-MM-DD format (see the dates of a sitting in get-proceedings)"),
  },
  handler: async (args: { term: number, proceeding: number, date: string }) => {
    const { term, proceeding, date } = args;
    const transcripts = await makeSejmRequest<StatementList>(
      `/term${term}/proceedings/${proceeding}/${date}/transcripts`
    );

    if (!transcripts.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the transcript statements for sitting ${proceeding} on ${date} in term ${term}.\n\nError: ${transcripts.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${transcripts.notice ?? ""}Fetched the transcript statements for sitting ${proceeding} on ${date} in term ${term}:\n\n${JSON.stringify(transcripts.data, null, 2)}`,
        },
      ],
    };
  },
};
