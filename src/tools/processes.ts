import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getProcessesTool = {
  description: "Get a list of legislative processes for a given term.",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
    sort_by: z.string().optional().describe("Sort by a specific field."),
  },
  handler: async (args: { term: number, offset?: number, limit?: number, sort_by?: string }) => {
    const { term, offset, limit, sort_by } = args;
    const processes = await makeSejmRequest<any[]>(
      `/term${term}/legislative-processes`,
      { offset, limit, sort_by },
    );

    if (!processes) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of legislative processes for term ${term}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of legislative processes for term ${term}:\n\n${JSON.stringify(processes, null, 2)}`,
        },
      ],
    };
  },
};
