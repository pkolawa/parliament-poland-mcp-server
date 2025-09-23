import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getCommitteesTool = {
  description: "Get a list of committees for a given term",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, offset?: number, limit?: number }) => {
    const { term, offset, limit } = args;
    const committees = await makeSejmRequest<any[]>(
      `/term${term}/committees`,
      { offset, limit },
    );

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

export const getCommitteeTool = {
  description: "Get detailed information about a specific committee",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    id: z.string().describe("ID of the committee (e.g., 'KFP', 'ESM')"),
  },
  handler: async (args: { term: number; id: string }) => {
    const { term, id } = args;
    const committee = await makeSejmRequest<any>(
      `/term${term}/committees/${id}`
    );

    if (!committee) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch details for committee ${id} in term ${term}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched details for committee ${id} in term ${term}:\n\n${JSON.stringify(committee, null, 2)}`,
        },
      ],
    };
  },
};