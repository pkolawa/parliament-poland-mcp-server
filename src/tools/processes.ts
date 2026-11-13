import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import type { LegislativeProcess } from "../types/api.js";

export const getProcessesTool = {
  description: "Get a list of legislative processes for a given term",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().nonnegative().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, offset?: number, limit?: number }) => {
    const { term, offset, limit } = args;
    const processes = await makeSejmRequest<LegislativeProcess[]>(
      `/term${term}/processes`,
      { offset, limit },
    );

    if (!processes.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of processes for term ${term}\n\nError: ${processes.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${processes.notice ?? ""}Fetched the list of processes for term ${term}:\n\n${JSON.stringify(processes.data, null, 2)}`,
        },
      ],
    };
  },
};

export const getPassedProcessesTool = {
  description: "Get a list of passed legislative processes for a given term",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    title: z.string().optional().describe("Phrase to search for in the title, in Polish (e.g. kodeksu pracy)"),
    documentType: z.string().optional().describe("Type of the document, in Polish (e.g. projekt ustawy)"),
    offset: z.number().int().nonnegative().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, title?: string, documentType?: string, offset?: number, limit?: number }) => {
    const { term, title, documentType, offset, limit } = args;
    const processes = await makeSejmRequest<LegislativeProcess[]>(
      `/term${term}/processes/passed`,
      { title, documentType, offset, limit },
    );

    if (!processes.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of passed processes for term ${term}.\n\nError: ${processes.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${processes.notice ?? ""}Fetched the list of passed processes for term ${term}:\n\n${JSON.stringify(processes.data, null, 2)}`,
        },
      ],
    };
  },
};
