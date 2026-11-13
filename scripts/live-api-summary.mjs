#!/usr/bin/env node
// Writes the results of the live Sejm API tests to the GitHub Actions job summary
// and raises a warning annotation when tests failed or did not run.
//
// Usage: node scripts/live-api-summary.mjs <jest --json results file>
// Env:   PROBE_STATUS        HTTP status of the API probe ("000" = no response), optional
//        GITHUB_STEP_SUMMARY set by GitHub Actions; without it the summary goes to stdout

import { appendFileSync, existsSync, readFileSync } from "node:fs";

const resultsPath = process.argv[2];
const probeStatus = process.env.PROBE_STATUS;
const probeFailed = probeStatus === "000" || probeStatus?.startsWith("5");

const lines = ["## Live Sejm API tests", ""];

function warn(message) {
  console.log(`::warning title=Live Sejm API tests::${message}`);
}

// One line per failure is enough for the summary; the full output is in the job log.
function firstLine(message = "") {
  const line = message
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean) ?? "";
  return (line.length > 200 ? `${line.slice(0, 200)}…` : line).replace(/`/g, "'");
}

if (probeStatus) {
  const probe = probeStatus === "000" ? "no response" : `HTTP ${probeStatus}`;
  lines.push(`API probe \`GET /sejm/term\`: **${probe}**`, "");
}

if (resultsPath && existsSync(resultsPath)) {
  const results = JSON.parse(readFileSync(resultsPath, "utf8"));
  lines.push(
    "| Passed | Failed | Skipped | Total |",
    "|---:|---:|---:|---:|",
    `| ${results.numPassedTests} | ${results.numFailedTests} | ${results.numPendingTests} | ${results.numTotalTests} |`,
    ""
  );

  const failures = results.testResults.flatMap((file) => {
    const failed = file.assertionResults
      .filter((test) => test.status === "failed")
      .map((test) => `- ${test.fullName}: \`${firstLine(test.failureMessages[0])}\``);
    // A suite that fails to load (e.g. a compile error) has no failed assertions.
    return failed.length === 0 && file.status === "failed"
      ? [`- ${file.name.split("/").pop()}: \`${firstLine(file.message)}\``]
      : failed;
  });

  if (failures.length > 0) {
    lines.push(
      "<details><summary>Failures</summary>",
      "",
      ...failures,
      "",
      "</details>",
      "",
      "API errors such as `HTTP 503` are logged by the client, so they appear in the job log rather than here.",
      ""
    );
    warn(`${failures.length} live API test(s) failed. See the job summary for details.`);
  }
} else {
  const message = probeFailed
    ? "Tests skipped: the Sejm API is unavailable from this runner."
    : "No test results: the test step did not run or crashed before writing them.";
  lines.push(message, "");
  warn(message);
}

const summary = lines.join("\n") + "\n";
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
} else {
  process.stdout.write(summary);
}
