import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { normalizeText, wordMatcher } from "../utils/text.js";
import {
  buildToolResponse,
  defineTool,
  describeFilters,
  describePage,
  objectOutput,
  pagedListOutput,
  paginate,
  withTerm,
} from "../utils/tool.js";
import { MpSchema, type Mp } from "../types/api.js";
import { limit, mpId, offset, term } from "./params.js";

/** MPs returned by get-members per page unless `limit` says otherwise. */
export const MP_PAGE_SIZE = 100;

/** Fields get-members returns for every MP; the full record is about 490 bytes, this about a quarter of it. */
const SUMMARY_FIELDS = ["id", "firstLastName", "club", "districtNum", "districtName", "voivodeship", "active"] as const;

/** Fields get-members returns only on request, through `fields`. */
export const EXTRA_MP_FIELDS = [
  "firstName",
  "secondName",
  "lastName",
  "lastFirstName",
  "genitiveName",
  "accusativeName",
  "birthDate",
  "birthLocation",
  "profession",
  "educationLevel",
  "numberOfVotes",
  "email",
  "inactiveCause",
  "waiverDesc",
] as const;

type ExtraMpField = (typeof EXTRA_MP_FIELDS)[number];

interface MpFilters {
  club?: string;
  name?: string;
  active?: boolean;
  district?: string;
  voivodeship?: string;
}

function mpFilter({ club, name, active, district, voivodeship }: MpFilters): (mp: Mp) => boolean {
  const clubId = club && normalizeText(club);
  const nameMatches = name ? wordMatcher(name) : undefined;
  const districtNum = district && /^\s*\d+\s*$/.test(district) ? Number(district) : undefined;
  const districtMatches = district && districtNum === undefined ? wordMatcher(district) : undefined;
  // Prefix match, so "pomorskie" does not also match "zachodniopomorskie" or "kujawsko-pomorskie".
  const region = voivodeship && normalizeText(voivodeship).trim().replace(/^wojewodztwo\s+/, "");

  return (mp) =>
    (!clubId || normalizeText(mp.club ?? "") === clubId) &&
    (!nameMatches || nameMatches(mp.firstLastName, mp.secondName)) &&
    (active === undefined || mp.active === active) &&
    (districtNum === undefined || mp.districtNum === districtNum) &&
    (!districtMatches || districtMatches(mp.districtName)) &&
    (!region || normalizeText(mp.voivodeship ?? "").startsWith(region));
}

function summarizeMp(mp: Mp, fields: readonly ExtraMpField[]): Mp {
  const summary: Record<string, unknown> = {};
  for (const field of [...SUMMARY_FIELDS, ...fields]) {
    if (mp[field] !== undefined) {
      summary[field] = mp[field];
    }
  }
  return summary as Mp;
}

export const getMpTool = defineTool({
  title: "Get an MP",
  description:
    "Get details of one member of the Sejm (poseł, MP): name, club, electoral district and voivodeship, " +
    "votes received, birth date and place, education, profession, e-mail, and whether the mandate is still held.",
  schema: {
    term: term(),
    id: mpId(),
  },
  outputSchema: objectOutput(MpSchema),
  handler: ({ term, id }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Mp>(`/term${term}/MP/${id}`),
        `Fetched information about the MP with ID ${id} in term ${term}:`,
        `Failed to fetch information about the MP with ID ${id} in term ${term}.`
      )
    ),
});

export const getMpsTool = defineTool({
  title: "List MPs",
  description:
    "List members of the Sejm (posłowie, MPs) in a term with their ID, name, club (klub), electoral district " +
    "(okręg wyborczy), voivodeship (województwo) and whether they still hold the mandate (active). " +
    "MPs who left during the term are included with active=false, so the list is longer than the 460 seats. " +
    `Returns ${MP_PAGE_SIZE} MPs per page; narrow the list with club, name, district, voivodeship or active. ` +
    "Ask for more fields (e.g. profession, birthDate) with `fields`; get-member returns everything about one MP. " +
    "The ID is the input of get-member, get-mp-voting-stats and get-mp-votings.",
  schema: {
    term: term(),
    club: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Only MPs of this club or circle (klub, koło), e.g. KO, PiS, PSL-TD, Lewica or Konfederacja, " +
          "or niez. for MPs outside any club: the `id` from get-clubs, case-insensitive"
      ),
    name: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Only MPs whose name contains all these words, in any order, e.g. Tusk or Szymon Hołownia; " +
          "case and Polish diacritics are ignored"
      ),
    active: z
      .boolean()
      .optional()
      .describe(
        "true: only MPs who hold their mandate now; false: only MPs whose mandate expired during the term " +
          "(e.g. after election to the European Parliament); both by default"
      ),
    district: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Only MPs elected in this electoral district (okręg wyborczy): its number, e.g. 13, " +
          "or the city it is named after, e.g. Kraków (a city can name more than one district)"
      ),
    voivodeship: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Only MPs elected in this voivodeship (województwo, one of the 16 regions of Poland), " +
          "e.g. mazowieckie or śląskie; Polish diacritics are optional"
      ),
    fields: z
      .array(z.enum(EXTRA_MP_FIELDS))
      .optional()
      .describe(
        "Extra fields to return for each MP, e.g. [\"profession\", \"birthDate\"]. By default only id, " +
          "firstLastName, club, districtNum, districtName, voivodeship and active are returned"
      ),
    offset: offset(),
    limit: limit(MP_PAGE_SIZE),
  },
  outputSchema: pagedListOutput(MpSchema),
  handler: ({ term, club, name, active, district, voivodeship, fields = [], offset, limit = MP_PAGE_SIZE }) =>
    withTerm(term, async (term) => {
      // The API returns every MP of the term (about 240 KB) and has no filters or pagination.
      const result = await makeSejmRequest<Mp[]>(`/term${term}/MP`);
      const noun = `MPs of term ${term}${describeFilters({ club, name, active, district, voivodeship })}`;
      return buildToolResponse(
        result,
        (page) => {
          const clubs = result.ok ? [...new Set(result.data.map((mp) => mp.club).filter(Boolean))].sort() : [];
          const hint = page.total === 0 && club && clubs.length ? ` (club IDs in term ${term}: ${clubs.join(", ")})` : "";
          return `Fetched ${describePage(page, noun)}${hint}:`;
        },
        `Failed to fetch the list of MPs for term ${term}`,
        (mps: Mp[]) =>
          paginate(
            mps.filter(mpFilter({ club, name, active, district, voivodeship })).map((mp) => summarizeMp(mp, fields)),
            offset,
            limit
          )
      );
    }),
});
