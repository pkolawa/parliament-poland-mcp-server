import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getVideosTool = {
  description: "Get a list of video recordings for a given term.",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
  },
  handler: async (args: { term: number }) => {
    const { term } = args;
    const videos = await makeSejmRequest<any[]>(`/term${term}/videos`);

    if (!videos) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of video recordings for term ${term}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of video recordings for term ${term}:\n\n${JSON.stringify(videos, null, 2)}`,
        },
      ],
    };
  },
};
