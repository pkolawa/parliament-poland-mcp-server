
import { getTermsTool } from "./terms.js";
import { getMpsTool, getMpTool } from "./mps.js";
import { getClubsTool } from "./clubs.js";
import { getCommitteesTool } from "./committees.js";
import { getInterpellationsTool } from "./interpellations.js";
import { getPrintsTool } from "./prints.js";
import { getProceedingsTool } from "./proceedings.js";
import { getProcessesTool } from "./processes.js";
import { getTranscriptsTool } from "./transcripts.js";
import { getVideosTool } from "./videos.js";
import { getVotingsTool } from "./votings.js";
import { getWrittenQuestionsTool } from "./writtenQuestions.js";

export const tools = {
  "get-terms": getTermsTool,
  "get-mps": getMpsTool,
  "get-mp": getMpTool,
  "get-clubs": getClubsTool,
  "get-committees": getCommitteesTool,
  "get-interpellations": getInterpellationsTool,
  "get-prints": getPrintsTool,
  "get-proceedings": getProceedingsTool,
  "get-processes": getProcessesTool,
  "get-transcripts": getTranscriptsTool,
  "get-videos": getVideosTool,
  "get-votings": getVotingsTool,
  "get-written-questions": getWrittenQuestionsTool,
};
