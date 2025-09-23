import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getProcessTool = {
  description: "Get information about a specific legislative process",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    processNumber:
      z.number().int().positive().describe("Number of the legislative process"),
  },
  handler: async (args: { term: number; processNumber: number }) => {
    const { term, processNumber } = args;
    const process = await makeSejmRequest<any>(
      `/term${term}/process/${processNumber}`
    );

    if (!process) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch process ${processNumber} for term ${term}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched process ${processNumber} for term ${term}:\n\n${JSON.stringify(
            process,
            null,
            2
          )}`,
        },
      ],
    };
  },
};