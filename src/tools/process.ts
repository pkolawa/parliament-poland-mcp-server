import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import type { LegislativeProcess } from "../types/api.js";

export const getProcessTool = {
  description: "Get information about a specific legislative process",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    processNumber: z
      .string()
      .regex(/^\d+(-[0-9A-Za-z]+)?$/, "Expected a print number such as 1070 or 16168-z")
      .describe("Print number identifying the legislative process, e.g. 1070 or 16168-z"),
  },
  handler: async (args: { term: number; processNumber: string }) => {
    const { term, processNumber } = args;
    const process = await makeSejmRequest<LegislativeProcess>(
      `/term${term}/processes/${processNumber}`
    );

    if (!process.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch process ${processNumber} for term ${term}.\n\nError: ${process.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${process.notice ?? ""}Fetched process ${processNumber} for term ${term}:\n\n${JSON.stringify(
            process.data,
            null,
            2
          )}`,
        },
      ],
    };
  },
};