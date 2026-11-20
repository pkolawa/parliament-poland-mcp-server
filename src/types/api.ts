import { z } from "zod";

/*
 * Schemas of Sejm API responses (https://api.sejm.gov.pl/sejm/openapi/), used both to type the
 * handlers and as the `outputSchema` of the tools. They are deliberately lenient: every field is
 * optional and nullable and every object accepts extra fields, so a new or missing field in the
 * API never makes a tool call fail output validation.
 */

const str = () => z.string().nullish();
const num = () => z.number().nullish();
const bool = () => z.boolean().nullish();
const strings = () => z.array(z.string()).nullish();
const obj = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough();
// A new instance per use: a schema object used twice becomes a JSON Schema $ref.
const links = () => z.array(obj({ href: str(), rel: str() })).nullish();

export const TermSchema = obj({
  num: num().describe("Term number"),
  current: bool().describe("Whether this is the current term"),
  from: str().describe("First day of the term (YYYY-MM-DD)"),
  to: str().describe("Last day of the term (YYYY-MM-DD); absent for the current term"),
  prints: obj({ count: num(), lastChanged: str(), link: str() }).nullish(),
});
export type Term = z.infer<typeof TermSchema>;

export const MpSchema = obj({
  id: num().describe("MP ID, used by the other MP tools"),
  firstLastName: str(),
  lastFirstName: str(),
  firstName: str(),
  secondName: str(),
  lastName: str(),
  genitiveName: str(),
  accusativeName: str(),
  email: str(),
  active: bool().describe("Whether the mandate is still held"),
  inactiveCause: str().describe("Why the mandate expired, for inactive MPs"),
  waiverDesc: str(),
  club: str().describe("ID of the MP's club (see get-clubs)"),
  districtNum: num().describe("Number of the electoral district (okręg wyborczy)"),
  districtName: str(),
  voivodeship: str(),
  birthDate: str(),
  birthLocation: str(),
  profession: str(),
  educationLevel: str(),
  numberOfVotes: num().describe("Votes received in the election"),
});
export type Mp = z.infer<typeof MpSchema>;

const memberSchema = () =>
  obj({
    id: num().describe("MP ID"),
    lastFirstName: str(),
    firstName: str(),
    lastName: str(),
    club: str(),
    function: str().describe("Function in the body, e.g. przewodniczący (chair)"),
    mandateExpired: str(),
    joinDate: str(),
    leaveDate: str(),
  });

export const ClubSchema = obj({
  id: str().describe("Club ID, e.g. KO or PiS"),
  name: str(),
  membersCount: num(),
  email: str(),
  phone: str(),
  fax: str(),
});
export type Club = z.infer<typeof ClubSchema>;

export const CommitteeSchema = obj({
  code: str().describe("Committee code, used by the other committee tools"),
  name: str(),
  nameGenitive: str(),
  type: str().describe("STANDING, EXTRAORDINARY or INVESTIGATIVE"),
  phone: str(),
  appointmentDate: str(),
  compositionDate: str(),
  dismissalDate: str(),
  scope: str().describe("Scope of the committee's work"),
  members: z.array(memberSchema()).nullish(),
  subCommittees: strings().describe("Codes of the subcommittees"),
});
export type Committee = z.infer<typeof CommitteeSchema>;

export const VideoSchema = obj({
  unid: str(),
  title: str(),
  description: str(),
  type: str().describe("Kind of event, e.g. posiedzenie (plenary sitting) or komisja (committee)"),
  room: str(),
  committee: str().describe("Committee code, for committee sittings"),
  subcommittee: str(),
  startDateTime: str(),
  endDateTime: str(),
  transcribe: bool(),
  videoLink: str(),
  otherVideoLinks: strings(),
  videoMessagesLink: str(),
  signLangLink: str(),
  audio: str(),
  playerLink: str(),
  playerLinkIFrame: str(),
});
export type Video = z.infer<typeof VideoSchema>;

export const CommitteeSittingSchema = obj({
  code: str(),
  num: num().describe("Sitting number, used by get-committee-sitting"),
  date: str().describe("YYYY-MM-DD"),
  startDateTime: str(),
  endDateTime: str(),
  status: str().describe("PLANNED, FINISHED or CANCELLED"),
  room: str(),
  city: str(),
  remote: bool(),
  closed: bool().describe("Closed to the public"),
  jointWith: z.array(obj({ code: str(), num: num() })).nullish(),
  notes: str(),
  comments: str(),
  audio: str(),
  agenda: str().describe("Agenda as plain text"),
  video: z.array(VideoSchema).nullish(),
});
export type CommitteeSitting = z.infer<typeof CommitteeSittingSchema>;

const replySchema = () =>
  obj({
    key: str().describe("Reply key, used by get-interpellation-text"),
    from: str().describe("Author of the reply"),
    receiptDate: str(),
    lastModified: str(),
    onlyAttachment: bool().describe("The reply is only in the attached PDF"),
    prolongation: bool().describe("Notice that the answer is postponed"),
    links: links(),
    attachments: z.array(obj({ name: str(), URL: str(), lastModified: str() })).nullish(),
  });

/** Interpellations (interpelacje) and written questions (zapytania) share one format. */
const parliamentaryQuestionShape = {
  num: num().describe("Number, used by the tools that take one item"),
  term: num(),
  title: str(),
  receiptDate: str(),
  sentDate: str(),
  lastModified: str(),
  from: strings().describe("IDs of the MPs who submitted it"),
  to: strings().describe("Recipients (ministers)"),
  recipientDetails: z.array(obj({ name: str(), sent: str(), answerDelayedDays: num() })).nullish(),
  answerDelayedDays: num().describe("Days the answer is overdue (0 when answered on time)"),
  links: links(),
  replies: z.array(replySchema()).nullish(),
};

export const InterpellationSchema = obj(parliamentaryQuestionShape);
export type Interpellation = z.infer<typeof InterpellationSchema>;

export const WrittenQuestionSchema = obj(parliamentaryQuestionShape);
export type WrittenQuestion = z.infer<typeof WrittenQuestionSchema>;

export const PrintSchema = obj({
  number: str().describe("Print number, e.g. 1070 or 1070-A"),
  term: num(),
  title: str(),
  documentDate: str(),
  deliveryDate: str(),
  changeDate: str(),
  numberAssociated: strings(),
  processPrint: strings().describe("Prints that started the legislative processes this print belongs to"),
  attachments: strings().describe("File names of the attachments (usually PDF and DOCX)"),
  additionalPrints: z.array(obj({ number: str(), title: str() })).nullish(),
});
export type Print = z.infer<typeof PrintSchema>;

export const ProceedingSchema = obj({
  number: num().describe("Sitting number, the `proceeding`/`sitting` parameter of other tools"),
  title: str(),
  current: bool(),
  dates: strings().describe("Days of the sitting (YYYY-MM-DD)"),
  agenda: str().describe("Agenda (porządek dzienny) as plain text"),
  schedule: str(),
  votings: str().describe("Schedule of votings"),
  currentAffairs: str(),
});
export type Proceeding = z.infer<typeof ProceedingSchema>;

const processShape = {
  number: str().describe("Number of the print that started the process; the ID of the process"),
  term: num(),
  title: str(),
  titleFinal: str().describe("Title of the act as passed"),
  description: str(),
  documentType: str().describe("Type of the document in Polish, e.g. projekt ustawy (bill)"),
  documentTypeEnum: str().describe("BILL, DRAFT_RESOLUTION, OTHER or CONSTITUTIONAL_TRIBUNAL_RULING"),
  documentDate: str(),
  processStartDate: str(),
  changeDate: str(),
  closureDate: str(),
  passed: bool(),
  urgencyStatus: str().describe("NORMAL, URGENT or URGENT_WITHDRAWN"),
  shortenProcedure: bool(),
  printsConsideredJointly: strings(),
  ELI: str().describe("European Legislation Identifier of the published act"),
  address: str().describe("Address of the published act in ISAP"),
  displayAddress: str().describe("Citation of the published act, e.g. Dz.U. 2024 poz. 1"),
  UE: str(),
  comments: str(),
  webGeneratedDate: str(),
  links: links(),
};

export const LegislativeProcessSchema = obj(processShape);
export type LegislativeProcess = z.infer<typeof LegislativeProcessSchema>;

export const LegislativeProcessDetailsSchema = obj({
  ...processShape,
  rclNum: str(),
  rclLink: str().describe("Government legislative process (RCL)"),
  stages: z
    .array(obj({ stageName: str(), stageType: str(), date: str(), children: z.array(obj({})).nullish() }))
    .nullish()
    .describe("Stages of the process, with nested child stages"),
});

const votingOptionSchema = () => obj({ optionIndex: num(), option: str(), description: str(), votes: num() });

const votingShape = {
  term: num(),
  sitting: num().describe("Sitting number"),
  sittingDay: num().describe("Day of the sitting, from 1"),
  votingNumber: num().describe("Voting number within the sitting, used by get-voting"),
  date: str().describe("Date and time of the voting"),
  title: str(),
  topic: str(),
  description: str(),
  kind: str().describe("ELECTRONIC, TRADITIONAL or ON_LIST (voting on a list of options)"),
  majorityType: str().describe("Majority required, e.g. SIMPLE_MAJORITY or ABSOLUTE_MAJORITY"),
  majorityVotes: num().describe("Votes needed to pass"),
  yes: num(),
  no: num(),
  abstain: num(),
  present: num(),
  notParticipating: num(),
  totalVoted: num(),
  againstAll: num(),
  votingOptions: z.array(votingOptionSchema()).nullish(),
  links: links(),
};

export const VotingSchema = obj(votingShape);
export type Voting = z.infer<typeof VotingSchema>;

export const VoteSchema = obj({
  MP: num().describe("MP ID"),
  firstName: str(),
  lastName: str(),
  secondName: str(),
  club: str(),
  vote: str().describe("YES, NO, ABSTAIN, ABSENT; VOTE_VALID for votings on a list"),
  listVotes: z.record(z.string(), z.unknown()).nullish().describe("Votes per option for votings on a list"),
});
export type Vote = z.infer<typeof VoteSchema>;

export const VotingDetailsSchema = obj({ ...votingShape, votes: z.array(VoteSchema).nullish() });
export type VotingDetails = z.infer<typeof VotingDetailsSchema>;

export const VotingResultSchema = obj({
  ...votingShape,
  votesByClub: z
    .record(z.string(), z.record(z.string(), z.number()))
    .describe("Number of votes of each kind (YES, NO, ABSTAIN, ABSENT…) per club"),
  votes: z.array(VoteSchema).nullish().describe("How each MP voted, when requested"),
});

export const VotingStatSchema = obj({
  sitting: num(),
  date: str(),
  numVotings: num().describe("Votings held that day"),
  numVoted: num().describe("Votings the MP took part in"),
  numMissed: num().describe("Votings the MP missed"),
  absenceExcuse: bool().describe("Whether the absence was excused"),
});
export type VotingStat = z.infer<typeof VotingStatSchema>;

export const MpVoteSchema = obj({
  votingNumber: num(),
  date: str(),
  title: str(),
  topic: str(),
  description: str(),
  kind: str(),
  vote: str().describe("YES, NO, ABSTAIN, ABSENT; VOTE_VALID for votings on a list"),
  listVotes: z.record(z.string(), z.unknown()).nullish(),
});
export type MpVote = z.infer<typeof MpVoteSchema>;

export const StatementListSchema = obj({
  proceedingNum: num(),
  date: str(),
  statements: z
    .array(
      obj({
        num: num().describe("Statement number, used by get-statement; 0 is the course of the sitting"),
        name: str().describe("Speaker"),
        function: str().describe("Speaker's function, e.g. Poseł or Minister"),
        memberID: num().describe("MP ID of the speaker, 0 if not an MP"),
        rapporteur: bool(),
        secretary: bool(),
        unspoken: bool().describe("Submitted in writing, not spoken"),
        startDateTime: str(),
        endDateTime: str(),
      })
    )
    .nullish(),
});
export type StatementList = z.infer<typeof StatementListSchema>;

export const BilateralGroupSchema = obj({
  id: num(),
  name: str(),
  engName: str(),
  appointmentDate: str(),
});
export type BilateralGroup = z.infer<typeof BilateralGroupSchema>;

/*
 * Legal acts from the ELI API (https://api.sejm.gov.pl/eli.html), lenient like the schemas above.
 */

// Fields that search results and act details share.
const actSummaryShape = {
  ELI: str().describe(
    "European Legislation Identifier: publisher/year/position, e.g. DU/2024/1; its parts identify the act in get-act and get-act-text"
  ),
  displayAddress: str().describe("Citation, e.g. Dz.U. 2024 poz. 1"),
  title: str(),
  type: str().describe("Type of act, e.g. Ustawa, Rozporządzenie or Obwieszczenie"),
  status: str().describe("Legal status in Polish, e.g. obowiązujący or uchylony"),
  inForce: str().describe("IN_FORCE, NOT_IN_FORCE or UNKNOWN"),
  announcementDate: str().describe("Date of the act, i.e. of its signing (YYYY-MM-DD)"),
  promulgation: str().describe("Date of publication (YYYY-MM-DD)"),
  entryIntoForce: str().describe("Date of entry into force (YYYY-MM-DD)"),
  textHTML: bool().describe("Whether get-act-text can return the text; otherwise the act is only a PDF"),
};

export const ActSchema = obj({
  ...actSummaryShape,
  address: str(),
  publisher: str().describe("DU (Dziennik Ustaw) or MP (Monitor Polski)"),
  year: num(),
  volume: num(),
  pos: num().describe("Position in the journal"),
  changeDate: str(),
  textPDF: bool(),
  validFrom: str(),
  repealDate: str(),
  expirationDate: str(),
  legalStatusDate: str(),
  comments: str(),
  releasedBy: strings().describe("Issuing authority"),
  authorizedBody: strings(),
  obligated: strings(),
  keywords: strings().describe("Keywords, as accepted by search-acts"),
  keywordsNames: strings(),
  previousTitle: strings(),
  directives: z.array(obj({ address: str(), title: str(), date: str() })).nullish(),
  texts: z.array(obj({ fileName: str(), type: str() })).nullish(),
  prints: z
    .array(obj({ term: num(), number: str(), link: str(), linkPrintAPI: str(), linkProcessAPI: str() }))
    .nullish()
    .describe("Sejm prints of the bill; their number identifies the legislative process in get-process"),
  references: z
    .record(z.string(), z.unknown())
    .nullish()
    .describe(
      "References to other acts by type, e.g. Akty zmieniające (amending acts) or Inf. o tekście jednolitym " +
        "(consolidated texts): lists of { id: ELI, art, date }. For acts with many references, each type is " +
        "summarized as { count, newest }; get-act with referenceType lists one type in full"
    ),
});
export type Act = z.infer<typeof ActSchema>;

export const ActSummarySchema = obj(actSummaryShape);

export const ActListSchema = obj({
  totalCount: num().describe("Number of acts that match the search"),
  offset: num(),
  count: num().describe("Number of acts in this response"),
  items: z.array(ActSchema).nullish(),
});
export type ActList = z.infer<typeof ActListSchema>;

/** A reference from one act to another, e.g. to an amending act. */
export interface ActReference {
  /** ELI of the referenced act, e.g. DU/2024/1. */
  id: string;
  art?: string;
  date?: string;
}

/** A unit of an act (book, chapter, article, paragraph…) in the structure of the act; not a tool output. */
export interface ActUnit {
  id: string;
  /** book, part, titl, bran, chpt, schp, arti, pass, para, pint, lett… */
  type: string;
  /** Number or name of the unit within its parent, e.g. 415 or 18_3_a for Art. 18^3a; absent for top-level parts. */
  name?: string;
  title?: string;
  children?: ActUnit[];
}
