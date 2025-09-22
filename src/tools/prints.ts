import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getPrintsTool = {
  description: "Get a list of prints for a given term.",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
  },
  handler: async (args: { term: number }) => {
    const { term } = args;
    const prints = await makeSejmRequest<any[]>(`/term${term}/prints`);

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
