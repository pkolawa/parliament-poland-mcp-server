import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getWrittenQuestionsTool = {
  description: "Get a list of written questions for a given term.",
  schema: {
    term: z.number().int().positive().describe("Term number of the Sejm"),
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, offset?: number, limit?: number }) => {
    const { term, offset, limit } = args;
    const writtenQuestions = await makeSejmRequest<any[]>(
      `/term${term}/written-questions`,
      { offset, limit },
    );

    if (!writtenQuestions) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of written questions for term ${term}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of written questions for term ${term}:\n\n${JSON.stringify(writtenQuestions, null, 2)}`,
        },
      ],
    };
  },
};
