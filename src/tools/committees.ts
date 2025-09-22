import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getCommitteesTool = {
  description: "Get a list of committees for a given term.",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
  },
  handler: async (args: { term: number }) => {
    const { term } = args;
    const committees = await makeSejmRequest<any[]>(`/term${term}/committees`);

    if (!committees) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of committees for term ${term}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of committees for term ${term}:\n\n${JSON.stringify(committees, null, 2)}`,
        },
      ],
    };
  },
};
