import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getProcessesTool = {
  description: "Get a list of legislative processes for a given term",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, offset?: number, limit?: number }) => {
    const { term, offset, limit } = args;
    const processes = await makeSejmRequest<any[]>(
      `/term${term}/processes`,
      { offset, limit },
    );

    if (!processes) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of processes for term ${term}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of processes for term ${term}:\n\n${JSON.stringify(processes, null, 2)}`,
        },
      ],
    };
  },
};
