import { makeSejmRequest } from "../utils/api.js";
import { buildToolResponse, defineTool, listOutput, withTerm } from "../utils/tool.js";
import { BilateralGroupSchema, type BilateralGroup } from "../types/api.js";
import { term } from "./params.js";

export const getBilateralGroupsTool = defineTool({
  title: "List bilateral groups",
  description:
    "List the bilateral groups of the Sejm (grupy bilateralne: parliamentary friendship groups for relations " +
    "with the parliament of another country) with their Polish and English names and appointment dates.",
  schema: {
    term: term(),
  },
  outputSchema: listOutput(BilateralGroupSchema),
  handler: ({ term }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<BilateralGroup[]>(`/term${term}/bilateralGroups`),
        `Fetched the list of bilateral groups for term ${term}:`,
        `Failed to fetch the list of bilateral groups for term ${term}.`
      )
    ),
});
