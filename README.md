![logo](logo.png)

# Parliament of Poland MCP Server

An MCP server for the Polish Parliament public API: the [Sejm API](https://api.sejm.gov.pl/sejm.html) (MPs, votings, legislative processes, ...) and the [ELI API](https://api.sejm.gov.pl/eli.html) of legal acts published in Dziennik Ustaw and Monitor Polski.

## Usage

This server is designed to be run with `npx`, allowing you to use it as a tool provider for LLM clients without a global installation. It requires Node.js 22 or newer.

### Running with `npx`

To start the server, run the following command:

```bash
npx parliament-poland-mcp-server
```

### Configuration for LLM Clients

To integrate this server with an LLM client (like LM Studio or others that support MCP), you can configure it to spawn the server process. Here is an example configuration:

```json
{
  "mcpServers": {
    "parliament-poland-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "parliament-poland-mcp-server"
      ]
    }
  }
}
```

This configuration tells the client how to start the tool server.

## Tools

Every tool is read-only (`readOnlyHint: true`) and queries the public Sejm API (`openWorldHint: true`).
`term` is optional in every Sejm tool and defaults to the current term of the Sejm; the legal act tools do not use it.
Tools that return data (all except the text tools `get-interpellation-text`, `get-statement` and `get-act-text`) declare an `outputSchema` and return the data as `structuredContent` too; lists come as `{ "items": [...] }`.
Lists that the Sejm API returns whole (MPs, votings of a sitting, clubs, committees, plenary sittings, terms) are filtered and paginated by the server and come as `{ "total", "offset", "nextOffset", "items" }`, where `nextOffset` is absent on the last page.

| Tool | What it returns |
| --- | --- |
| `get-terms` | Terms (kadencje) of the Sejm with their dates; the current one is the default `term` |
| `get-members` | MPs (posłowie) of a term with their ID, club and district, filtered by club, name, district, voivodeship or active; 100 per page |
| `get-member` | Details of one MP |
| `get-mp-voting-stats` | An MP's attendance in votings for each sitting day |
| `get-mp-votings` | How an MP voted in every voting on one sitting day |
| `get-clubs` | Parliamentary clubs and circles (kluby i koła) |
| `get-club` | Details of one club |
| `get-committees` | Committees (komisje) with their codes |
| `get-committee` | Details of one committee, with members |
| `get-committee-sittings` | Sittings of a committee, filtered by date, with the agenda as text |
| `get-committee-sitting` | One committee sitting with its agenda and videos |
| `get-interpellations` | Interpellations (interpelacje), filtered by title, MP, recipient, date or delay |
| `get-interpellation` | Details of one interpellation, with its replies |
| `get-interpellation-text` | Text of an interpellation or of a reply to it |
| `get-written-questions` | Written questions (zapytania), filtered like interpellations |
| `get-prints` | Prints (druki: bills, reports and other documents) |
| `get-print` | Details of one print |
| `get-proceedings` | Plenary sittings (posiedzenia) with their numbers and dates |
| `get-proceeding` | One plenary sitting with its agenda as text |
| `get-current-proceeding` | The current or next plenary sitting with its agenda as text |
| `get-processes` | Legislative processes, filtered by title or document type |
| `get-passed-processes` | Legislative processes that ended with a passed act |
| `get-process` | One legislative process with its stages, identified by its print number |
| `get-transcripts` | Statements in the transcript of one sitting day |
| `get-statement` | Text of one statement |
| `get-videos` | Video transmissions of a term |
| `get-videos-by-date` | Video transmissions of one day (today by default) |
| `get-votings` | Votings of one plenary sitting, filtered by day or title; 50 per page |
| `get-voting` | Result of one voting with a breakdown by club, optionally with each MP's vote |
| `search-votings` | Votings found by title, sitting or date range |
| `get-bilateral-groups` | Bilateral groups (parliamentary friendship groups) |
| `search-acts` | Legal acts in Dziennik Ustaw and Monitor Polski, by title, type, keywords, status or dates |
| `get-act` | Details of one legal act, with references to other acts (amending acts, consolidated texts…) |
| `get-act-text` | Text of a legal act or of one of its articles, in pages |
| `get-act-keywords` | Keywords that `search-acts` accepts |

Legal acts come from the [ELI API](https://api.sejm.gov.pl/eli.html), which works independently of the Sejm API. An act is identified by its ELI: publisher (`DU` for Dziennik Ustaw, `MP` for Monitor Polski), year and position, e.g. `DU/2024/1`. The `ELI` field of a legislative process from `get-process` or `get-passed-processes` leads from a bill passed by the Sejm to the act as published, and the `prints` of an act lead back to the process.

## Upgrading from 1.x

Version 2.0 makes the tools easier for LLMs to use and contains breaking changes:

- **Tool names.** Tools are registered under short kebab-case names, e.g. `get-members` instead of `Get-a-list-of-MPs-for-a-given-term`. Update any client configuration, allow-lists or prompts that refer to the old names:

  <details><summary>Old and new tool names</summary>

  | 2.0 | 1.x |
  | --- | --- |
  | `get-terms` | `Get-a-list-of-Sejm-terms` |
  | `get-members` | `Get-a-list-of-MPs-for-a-given-term` |
  | `get-member` | `Get-information-about-a-member-of-Parliament` |
  | `get-mp-voting-stats` | `Get-voting-attendance-statistics-of-an-MP-for-each-sitting-day` |
  | `get-mp-votings` | `Get-how-an-MP-voted-on-a-given-sitting-day` |
  | `get-clubs` | `Get-a-list-of-clubs-for-a-given-term` |
  | `get-club` | `Get-detailed-information-about-a-specific-club` |
  | `get-committees` | `Get-a-list-of-committees-for-a-given-term` |
  | `get-committee` | `Get-detailed-information-about-a-specific-committee` |
  | `get-committee-sittings` | `Get-a-list-of-sittings-of-a-committee` |
  | `get-committee-sitting` | `Get-details-about-a-single-committee-sitting` |
  | `get-interpellations` | `Get-a-list-of-interpellations-for-a-given-term` |
  | `get-interpellation` | `Get-detailed-information-about-a-specific-interpellation` |
  | `get-interpellation-text` | `Get-the-text-of-an-interpellation-or-of-a-reply-to-it` |
  | `get-prints` | `Get-a-list-of-prints-for-a-given-term` |
  | `get-print` | `Get-detailed-information-about-a-specific-print` |
  | `get-proceedings` | `Get-a-list-of-proceedings-for-a-given-term` |
  | `get-current-proceeding` | `Get-the-current-or-next-sitting-of-the-Sejm-with-its-agenda` |
  | `get-process` | `Get-information-about-a-specific-legislative-process` |
  | `get-processes` | `Get-a-list-of-legislative-processes-for-a-given-term` |
  | `get-passed-processes` | `Get-a-list-of-passed-legislative-processes-for-a-given-term` |
  | `get-transcripts` | `Get-the-list-of-transcript-statements-for-a-Sejm-sitting-day` |
  | `get-statement` | `Get-the-text-of-a-single-statement-from-a-Sejm-sitting-transcript` |
  | `get-videos` | `Get-a-list-of-video-recordings-for-a-given-term` |
  | `get-videos-by-date` | `Get-video-transmissions-from-a-given-day` |
  | `get-votings` | `Get-a-list-of-votings-for-a-given-term` |
  | `get-voting` | `Get-the-results-of-a-single-voting-with-a-breakdown-by-club` |
  | `search-votings` | `Search-for-votings-in-a-given-term` |
  | `get-written-questions` | `Get-a-list-of-written-questions-for-a-given-term` |
  | `get-bilateral-groups` | `Get-a-list-of-bilateral-groups-in-the-Sejm` |
  | `search-acts` | `Search-Polish-legal-acts-in-Dziennik-Ustaw-and-Monitor-Polski` |
  | `get-act` | `Get-details-of-a-Polish-legal-act` |
  | `get-act-text` | `Get-the-text-of-a-Polish-legal-act-or-of-one-of-its-articles` |
  | `get-act-keywords` | `List-keywords-used-to-classify-Polish-legal-acts` |

  </details>

- **`term` is optional** everywhere and defaults to the current term.
- **Responses** contain compact JSON (no indentation) instead of pretty-printed JSON, and JSON tools also return `structuredContent` matching their `outputSchema`. The text messages before the data are unchanged.
- **`get-interpellations`** sends its filters to the API under the names the API supports, so `dateFrom`, `dateTo` and `mp` now actually filter the results. The `number`, `club` and `status` parameters, which the API never supported, are removed; use `get-interpellation` for a single interpellation and `delayed: true` for interpellations with an overdue answer. New parameters: `recipient`, `modifiedSince`, `delayed`.
- **`get-written-questions`** accepts only an MP ID in `from` and gains `delayed`.
- **`get-proceedings`** no longer returns the agenda and schedules of each sitting as HTML, which made the list about 700 KB; it returns the number, title, dates and `current` flag. The new **`get-proceeding`** tool returns one sitting with its agenda as plain text.
- **`get-members`** returns 100 MPs per page with `id`, `firstLastName`, `club`, `districtNum`, `districtName`, `voivodeship` and `active` (about 14 KB instead of 240 KB for all 494 MPs of the 10th term). Ask for more fields with `fields` (e.g. `["profession", "birthDate"]`); `get-member` returns everything about one MP. New filters: `club`, `name` (ignores case and Polish diacritics), `active`, `district` (number or name) and `voivodeship`.
- **`get-votings`** returns 50 votings per page (the 147 votings of the first sitting of the 10th term were 87 KB) without the PDF link and the term. New filters: `date` (a day of the sitting) and `title` (words in the title, topic or description). `search-votings` returns the same fields.
- **Pagination of whole lists.** `offset` and `limit` of `get-members`, `get-votings`, `get-clubs`, `get-committees`, `get-proceedings` and `get-terms` are applied by the server, because the API does not document them for these lists. These tools now return `total` and `nextOffset` with the items. `get-clubs`, `get-committees`, `get-proceedings` and `get-terms` still return the whole list by default. `get-prints` returns 50 prints by default and paginates the list itself if the API returns more than `limit`.
- **`get-print`** takes `printNumber` as a string, so additional prints such as `1070-A` can be fetched.
- **`get-processes`** gains the `title` and `documentType` filters of `get-passed-processes`.
- Parameters with a fixed format are validated: dates (`YYYY-MM-DD`), club IDs, print numbers and sort fields.

## Development

To run the server in a development environment:

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Run unit tests: `npm test`
4.  Run live API integration tests (requires internet access): `npm run test:live-api`
5.  Build the project: `npm run build`
6.  Run the server: `npm start`

## Author

Piotr Kolawa ([@pkolawa](https://github.com/pkolawa)) / ([Linkedin](https://linkedin.com/in/pkolawa))

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
