import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getPrintsTool = {
  description: "Get a list of prints for a given term.",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
    sort_by: z.string().optional().describe("Sort by a specific field."),
  },
  handler: async (args: { term: number, offset?: number, limit?: number, sort_by?: string }) => {
    const { term, offset, limit, sort_by } = args;
    const prints = await makeSejmRequest<any[]>(
      `/term${term}/prints`,
      { offset, limit, sort_by },
    );

    if (!prints) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of prints for term ${term}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of prints for term ${term}:\n\n${JSON.stringify(prints, null, 2)}`,
        },
      ],
    };
  },
};
