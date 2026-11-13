![logo](logo.png)

# Parliament of Poland MCP Server

An MCP server for the Polish Parliament public API.

## Usage

This server is designed to be run with `npx`, allowing you to use it as a tool provider for LLM clients without a global installation.

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
`term` is optional in every tool and defaults to the current term of the Sejm.
Tools that return data (all except the two text tools) declare an `outputSchema` and return the data as `structuredContent` too; lists come as `{ "items": [...] }`.

| Tool | What it returns |
| --- | --- |
| `get-terms` | Terms (kadencje) of the Sejm with their dates; the current one is the default `term` |
| `get-members` | MPs (posłowie) of a term with their ID, club and district |
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
| `get-current-proceeding` | The current or next plenary sitting with its agenda as text |
| `get-processes` | Legislative processes, filtered by title or document type |
| `get-passed-processes` | Legislative processes that ended with a passed act |
| `get-process` | One legislative process with its stages, identified by its print number |
| `get-transcripts` | Statements in the transcript of one sitting day |
| `get-statement` | Text of one statement |
| `get-videos` | Video transmissions of a term |
| `get-videos-by-date` | Video transmissions of one day (today by default) |
| `get-votings` | Votings of one plenary sitting |
| `get-voting` | Result of one voting with a breakdown by club, optionally with each MP's vote |
| `search-votings` | Votings found by title, sitting or date range |
| `get-bilateral-groups` | Bilateral groups (parliamentary friendship groups) |

## Upgrading from 1.x

Version 2.0 makes the tools easier for LLMs to use and contains breaking changes:

- **Tool names.** Tools are registered under short kebab-case names, e.g. `get-members` instead of `Get-a-list-of-MPs-for-a-given-term`. Update any client configuration, allow-lists or prompts that refer to the old names. The old name of each tool was its 1.x description with spaces replaced by dashes.
- **`term` is optional** everywhere and defaults to the current term.
- **Responses** contain compact JSON (no indentation) instead of pretty-printed JSON, and JSON tools also return `structuredContent` matching their `outputSchema`. The text messages before the data are unchanged.
- **`get-interpellations`** sends its filters to the API under the names the API supports, so `dateFrom`, `dateTo` and `mp` now actually filter the results. The `number`, `club` and `status` parameters, which the API never supported, are removed; use `get-interpellation` for a single interpellation and `delayed: true` for interpellations with an overdue answer. New parameters: `recipient`, `modifiedSince`, `delayed`.
- **`get-written-questions`** accepts only an MP ID in `from` and gains `delayed`.
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
