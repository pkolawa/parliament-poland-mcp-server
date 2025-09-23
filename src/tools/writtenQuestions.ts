import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getWrittenQuestionsTool = {
  description: "Get a list of written questions for a given term.",
  schema: {
    term: z.number().int().positive().describe("Term number of the Sejm"),
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
    sort_by: z.string().optional().describe("Sort by a specific field."),
    title: z.string().optional().describe("Search for a phrase in the title."),
    from: z.string().optional().describe("Search by MP's name or ID."),
    to: z.string().optional().describe("Search by recipient ministry."),
    since: z.string().optional().describe("Search questions from a specific date."),
    till: z.string().optional().describe("Search questions up to a specific date."),
    modifiedSince: z.string().optional().describe("Return questions modified since a specific date."),
  },
  handler: async (args: { term: number, offset?: number, limit?: number, sort_by?: string, title?: string, from?: string, to?: string, since?: string, till?: string, modifiedSince?: string }) => {
    const { term, offset, limit, sort_by, title, from, to, since, till, modifiedSince } = args;
    const writtenQuestions = await makeSejmRequest<any[]>(
      `/term${term}/written-questions`,
      { offset, limit, sort_by, title, from, to, since, till, modifiedSince },
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
