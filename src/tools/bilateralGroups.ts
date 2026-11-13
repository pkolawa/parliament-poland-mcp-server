import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import type { BilateralGroup } from "../types/api.js";

export const getBilateralGroupsTool = {
  description: "Get a list of bilateral groups in the Sejm",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
  },
  handler: async (args: { term: number }) => {
    const { term } = args;
    const groups = await makeSejmRequest<BilateralGroup[]>(`/term${term}/bilateralGroups`);

    if (!groups.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of bilateral groups for term ${term}.\n\nError: ${groups.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of bilateral groups for term ${term}:\n\n${JSON.stringify(
            groups.data,
            null,
            2
          )}`,
        },
      ],
    };
  },
};