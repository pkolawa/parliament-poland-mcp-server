import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getProceedingsTool = {
  description: "Get a list of proceedings for a given term.",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
  },
  handler: async (args: { term: number }) => {
    const { term } = args;
    const proceedings = await makeSejmRequest<any[]>(`/term${term}/proceedings`);

    if (!proceedings) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of proceedings for term ${term}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of proceedings for term ${term}:\n\n${JSON.stringify(proceedings, null, 2)}`,
        },
      ],
    };
  },
};
