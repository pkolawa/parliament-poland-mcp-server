import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";


export const getMpTool = {
  description: "Get information about a member of Parliament.",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    id: z.number().int().positive().describe("ID of the MP"),
  },
  handler: async (args: { term: number; id: number }) => {
    const { term, id } = args;
    const mp = await makeSejmRequest<any>(`/term${term}/MP/${id}`);

    if (!mp) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch information about the MP with ID ${id} in term ${term}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched information about the MP with ID ${id} in term ${term}:\n\n${JSON.stringify(mp, null, 2)}`,
        },
      ],
    };
  },
};

export const getMpsTool = {

  description: "Get a list of MPs for a given term.",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
  },
  handler: async (args: { term: number }) => {
    const { term } = args;
    const mps = await makeSejmRequest<any[]>(`/term${term}/MP`);

    if (!mps) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of MPs for term ${term}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of MPs for term ${term}:\n\n${JSON.stringify(mps, null, 2)}`,
        },
      ],
    };
  },
};
