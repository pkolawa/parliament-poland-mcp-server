
import { getTermsTool } from "./terms.js";
import { getMpsTool, getMpTool } from "./mps.js";
import { getMpVotingStatsTool, getMpVotingsTool } from "./mpVotings.js";
import { getClubTool, getClubsTool } from "./clubs.js";
import {
  getCommitteesTool,
  getCommitteeTool,
  getCommitteeSittingsTool,
  getCommitteeSittingTool,
} from "./committees.js";
import {
  getInterpellationsTool,
  getInterpellationTool,
  getInterpellationTextTool,
} from "./interpellations.js";
import { getPrintsTool, getPrintTool } from "./prints.js";
import { getProceedingsTool, getProceedingTool, getCurrentProceedingTool } from "./proceedings.js";
import { getProcessTool } from "./process.js";
import { getProcessesTool, getPassedProcessesTool } from "./processes.js";
import { getTranscriptsTool, getStatementTool } from "./transcripts.js";
import { getVideosTool, getVideosByDateTool } from "./videos.js";
import { getVotingsTool, getVotingTool, searchVotingsTool } from "./votings.js";
import { getWrittenQuestionsTool } from "./writtenQuestions.js";
import { getBilateralGroupsTool } from "./bilateralGroups.js";

export const tools = {
  "get-terms": getTermsTool,
  "get-members": getMpsTool,
  "get-member": getMpTool,
  "get-mp-voting-stats": getMpVotingStatsTool,
  "get-mp-votings": getMpVotingsTool,
  "get-clubs": getClubsTool,
  "get-club": getClubTool,
  "get-committees": getCommitteesTool,
  "get-committee": getCommitteeTool,
  "get-committee-sittings": getCommitteeSittingsTool,
  "get-committee-sitting": getCommitteeSittingTool,
  "get-interpellations": getInterpellationsTool,
  "get-interpellation": getInterpellationTool,
  "get-interpellation-text": getInterpellationTextTool,
  "get-prints": getPrintsTool,
  "get-print": getPrintTool,
  "get-proceedings": getProceedingsTool,
  "get-proceeding": getProceedingTool,
  "get-current-proceeding": getCurrentProceedingTool,
  "get-process": getProcessTool,
  "get-processes": getProcessesTool,
  "get-passed-processes": getPassedProcessesTool,
  "get-transcripts": getTranscriptsTool,
  "get-statement": getStatementTool,
  "get-videos": getVideosTool,
  "get-videos-by-date": getVideosByDateTool,
  "get-votings": getVotingsTool,
  "get-voting": getVotingTool,
  "search-votings": searchVotingsTool,
  "get-written-questions": getWrittenQuestionsTool,
  "get-bilateral-groups": getBilateralGroupsTool,
};
