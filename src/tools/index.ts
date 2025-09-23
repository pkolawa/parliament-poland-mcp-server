
import { getTermsTool } from "./terms.js";
import { getMpsTool, getMpTool } from "./mps.js";
import { getClubsTool, getClubTool } from "./clubs.js";
import { getCommitteesTool } from "./committees.js";
import { getInterpellationsTool } from "./interpellations.js";
import { getPrintsTool, getPrintTool } from "./prints.js";
import { getProceedingsTool } from "./proceedings.js";
import { getProcessTool } from "./process.js";
import { getProcessesTool } from "./processes.js";
import { getTranscriptsTool } from "./transcripts.js";
import { getVideosTool } from "./videos.js";
import { getVotingsTool } from "./votings.js";
import { getWrittenQuestionsTool } from "./writtenQuestions.js";
import { getBilateralGroupsTool } from "./bilateralGroups.js";

export const tools = {
  "get-terms": getTermsTool,
  "get-members": getMpsTool,
  "get-member": getMpTool,
  "get-clubs": getClubsTool,
  "get-club": getClubTool,
  "get-committees": getCommitteesTool,
  "get-interpellations": getInterpellationsTool,
  "get-prints": getPrintsTool,
  "get-print": getPrintTool,
  "get-proceedings": getProceedingsTool,
  "get-process": getProcessTool,
  "get-processes": getProcessesTool,
  "get-transcripts": getTranscriptsTool,
  "get-videos": getVideosTool,
  "get-votings": getVotingsTool,
  "get-written-questions": getWrittenQuestionsTool,
  "get-bilateral-groups": getBilateralGroupsTool,
};
