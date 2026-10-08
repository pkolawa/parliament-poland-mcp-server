import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import type { Term } from "../types/api.js";

export const getTermsTool = {
  description: "Get a list of Sejm terms",
  schema: {
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { offset?: number, limit?: number }) => {
    const { offset, limit } = args;
    const terms = await makeSejmRequest<Term[]>("/term", { offset, limit });

    if (!terms.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of terms.\n\nError: ${terms.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of Sejm terms:\n\n${JSON.stringify(terms.data, null, 2)}`,
        },
      ],
    };
  },
};
