import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getInterpellationsTool = {
  description: "Get a list of interpellations for a given term.",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, offset?: number, limit?: number }) => {
    const { term, offset, limit } = args;
    const interpellations = await makeSejmRequest<any[]>(
      `/term${term}/interpellations`,
      { offset, limit },
    );

    if (!interpellations) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of interpellations for term ${term}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of interpellations for term ${term}:\n\n${JSON.stringify(interpellations, null, 2)}`,
        },
      ],
    };
  },
};
