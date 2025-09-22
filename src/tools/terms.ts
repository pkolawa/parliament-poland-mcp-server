import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getTermsTool = {
  description: "Get a list of Sejm terms.",
  schema: {},
  handler: async () => {
    const terms = await makeSejmRequest<any[]>("/term");

    if (!terms) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Failed to fetch the list of terms.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of Sejm terms:\n\n${JSON.stringify(terms, null, 2)}`,
        },
      ],
    };
  },
};
