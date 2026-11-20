import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { buildToolResponse, defineTool, listOutput, withTerm } from "../utils/tool.js";
import { LegislativeProcessSchema, type LegislativeProcess } from "../types/api.js";
import { limit, offset, term, title } from "./params.js";

const documentType = () =>
  z.string().min(1).optional().describe("Type of the document, in Polish (e.g. projekt ustawy)");

export const getProcessesTool = defineTool({
  title: "List legislative processes",
  description:
    "List legislative processes (procesy legislacyjne: bills and draft resolutions going through the Sejm) in a term " +
    "with their number, title, document type, dates and whether they passed. " +
    "Get the stages of one process with get-process.",
  schema: {
    term: term(),
    title: title("process"),
    documentType: documentType(),
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(LegislativeProcessSchema),
  handler: ({ term, title, documentType, offset, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<LegislativeProcess[]>(`/term${term}/processes`, { title, documentType, offset, limit }),
        `Fetched the list of processes for term ${term}:`,
        `Failed to fetch the list of processes for term ${term}`
      )
    ),
});

export const getPassedProcessesTool = defineTool({
  title: "List passed legislative processes",
  description:
    "List legislative processes that ended with the act being passed (uchwalone) in a term, with the title of the " +
    "act as passed and the ELI and citation (Dz.U./M.P.) of the published act.",
  schema: {
    term: term(),
    title: title("process"),
    documentType: documentType(),
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(LegislativeProcessSchema),
  handler: ({ term, title, documentType, offset, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<LegislativeProcess[]>(`/term${term}/processes/passed`, {
          title,
          documentType,
          offset,
          limit,
        }),
        `Fetched the list of passed processes for term ${term}:`,
        `Failed to fetch the list of passed processes for term ${term}.`
      )
    ),
});
