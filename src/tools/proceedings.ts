import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { htmlToText } from "../utils/html.js";
import type { Proceeding } from "../types/api.js";

export const getProceedingsTool = {
  description: "Get a list of proceedings for a given term",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().nonnegative().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, offset?: number, limit?: number }) => {
    const { term, offset, limit } = args;
    const proceedings = await makeSejmRequest<Proceeding[]>(
      `/term${term}/proceedings`,
      { offset, limit },
    );

    if (!proceedings.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of proceedings for term ${term}.\n\nError: ${proceedings.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${proceedings.notice ?? ""}Fetched the list of proceedings for term ${term}:\n\n${JSON.stringify(proceedings.data, null, 2)}`,
        },
      ],
    };
  },
};

export const getCurrentProceedingTool = {
  description: "Get the current or next sitting of the Sejm with its agenda",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
  },
  handler: async (args: { term: number }) => {
    const { term } = args;
    const proceeding = await makeSejmRequest<Proceeding>(`/term${term}/proceedings/current`);

    if (!proceeding.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the current sitting for term ${term}.\n\nError: ${proceeding.error.message}`,
          },
        ],
        isError: true,
      };
    }

    const result = { ...proceeding.data };
    for (const field of ["agenda", "currentAffairs", "schedule", "votings"] as const) {
      const html = result[field];
      if (html) {
        result[field] = htmlToText(html);
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${proceeding.notice ?? ""}Fetched the current sitting for term ${term}:\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  },
};
