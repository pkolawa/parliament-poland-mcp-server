import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getTermsTool = {
  description: "Get a list of Sejm terms",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
  },
  handler: async (params: { term: number }) => {
    const { term } = params;
    const termDetails = await makeSejmRequest<any[]>(`/term${term}`);

    if (!termDetails) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Failed to fetch the details about the term.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the details about the term number ${term}:\n\n${JSON.stringify(termDetails, null, 2)}`,
        },
      ],
    };
  },
};
