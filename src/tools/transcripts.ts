import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import type { Transcript } from "../types/api.js";

export const getTranscriptsTool = {
  description: "Get a list of transcripts for a given term",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, offset?: number, limit?: number }) => {
    const { term, offset, limit } = args;
    const transcripts = await makeSejmRequest<Transcript[]>(
      `/term${term}/speeches`,
      { offset, limit },
    );

    if (!transcripts.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of transcripts for term ${term}.\n\nError: ${transcripts.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of transcripts for term ${term}:\n\n${JSON.stringify(transcripts.data, null, 2)}`,
        },
      ],
    };
  },
};
