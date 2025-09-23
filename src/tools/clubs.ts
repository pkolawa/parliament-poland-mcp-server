import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getClubsTool = {
  description: "Get a list of clubs for a given term.",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, offset?: number, limit?: number }) => {
    const { term, offset, limit } = args;
    const clubs = await makeSejmRequest<any[]>(
      `/term${term}/clubs`,
      { offset, limit },
    );

    if (!clubs) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of clubs for term ${term}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of clubs for term ${term}:\n\n${JSON.stringify(clubs, null, 2)}`,
        },
      ],
    };
  },
};