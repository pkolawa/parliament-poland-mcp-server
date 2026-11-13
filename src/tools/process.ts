import { makeSejmRequest } from "../utils/api.js";
import { buildToolResponse, defineTool, objectOutput, withTerm } from "../utils/tool.js";
import { LegislativeProcessDetailsSchema, type LegislativeProcess } from "../types/api.js";
import { printNumber, term } from "./params.js";

export const getProcessTool = defineTool({
  title: "Get a legislative process",
  description:
    "Get one legislative process (proces legislacyjny: the path of a bill or resolution through the Sejm, " +
    "Senate and President) with its stages and dates (readings, committee work, votings, Senate position, " +
    "signature), whether it passed, and the ELI and citation of the published act.",
  schema: {
    term: term(),
    processNumber: printNumber(
      "Number of the print that started the process, e.g. 1070: the `number` field from get-processes or get-passed-processes"
    ),
  },
  outputSchema: objectOutput(LegislativeProcessDetailsSchema),
  handler: ({ term, processNumber }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<LegislativeProcess>(`/term${term}/processes/${processNumber}`),
        `Fetched process ${processNumber} for term ${term}:`,
        `Failed to fetch process ${processNumber} for term ${term}.`
      )
    ),
});
