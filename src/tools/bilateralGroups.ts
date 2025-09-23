import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getBilateralGroupsTool = {
  description: "Get a list of bilateral groups in the Sejm",
  schema: {},
  handler: async () => {
    const groups = await makeSejmRequest<any[]>("/bilateralGroups");

    if (!groups) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Failed to fetch the list of bilateral groups.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of bilateral groups:\n\n${JSON.stringify(
            groups,
            null,
            2
          )}`,
        },
      ],
    };
  },
};