import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import type { Committee } from "../types/api.js";

export const getCommitteesTool = {
  description: "Get a list of committees for a given term",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, offset?: number, limit?: number }) => {
    const { term, offset, limit } = args;
    const committees = await makeSejmRequest<Committee[]>(
      `/term${term}/committees`,
      { offset, limit },
    );

    if (!committees.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of committees for term ${term}.\n\nError: ${committees.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of committees for term ${term}:\n\n${JSON.stringify(committees.data, null, 2)}`,
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
    const committee = await makeSejmRequest<Committee>(
      `/term${term}/committees/${id}`
    );

    if (!committee.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch details for committee ${id} in term ${term}.\n\nError: ${committee.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched details for committee ${id} in term ${term}:\n\n${JSON.stringify(committee.data, null, 2)}`,
        },
      ],
    };
  },
};