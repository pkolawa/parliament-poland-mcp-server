import { makeSejmRequest } from "../utils/api.js";
import { buildToolResponse, defineTool, listOutput } from "../utils/tool.js";
import { TermSchema, type Term } from "../types/api.js";
import { limit, offset } from "./params.js";

export const getTermsTool = defineTool({
  title: "List Sejm terms",
  description:
    "List the terms (kadencje: four-year parliaments elected together) of the Sejm, the lower house of the Polish " +
    "Parliament, with their start and end dates. " +
    "The term marked current=true is the one all other tools use when `term` is omitted.",
  schema: {
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(TermSchema),
  handler: async ({ offset, limit }) =>
    buildToolResponse(
      await makeSejmRequest<Term[]>("/term", { offset, limit }),
      "Fetched the list of Sejm terms:",
      "Failed to fetch the list of terms."
    ),
});
