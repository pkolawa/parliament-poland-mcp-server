import { makeSejmRequest } from "../utils/api.js";
import { buildToolResponse, defineTool, listOutput, withTerm } from "../utils/tool.js";
import { VideoSchema, type Video } from "../types/api.js";
import { date, limit, offset, term } from "./params.js";

export const getVideosTool = defineTool({
  title: "List video transmissions",
  description:
    "List video transmissions (transmisje) of plenary sittings, committee sittings and other events in the Sejm " +
    "in a term, with title, type, room, start time and links to the player and the video.",
  schema: {
    term: term(),
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(VideoSchema),
  handler: ({ term, offset, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Video[]>(`/term${term}/videos`, { offset, limit }),
        `Fetched the list of video recordings for term ${term}:`,
        `Failed to fetch the list of video recordings for term ${term}.`
      )
    ),
});

export const getVideosByDateTool = defineTool({
  title: "List video transmissions of a day",
  description:
    "List video transmissions (transmisje) from the Sejm on one day: plenary and committee sittings and other events, " +
    "with title, type, room, start time and links to the player and the video.",
  schema: {
    term: term(),
    date: date("Day of the transmissions; omit for today").optional(),
  },
  outputSchema: listOutput(VideoSchema),
  handler: ({ term, date }) =>
    withTerm(term, async (term) => {
      const day = date ?? "today";
      return buildToolResponse(
        await makeSejmRequest<Video[]>(`/term${term}/videos/${day}`),
        `Fetched video transmissions for ${day} in term ${term}:`,
        `Failed to fetch video transmissions for ${day} in term ${term}.`
      );
    }),
});
