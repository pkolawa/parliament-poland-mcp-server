export interface Term {
  num: number;
  current: boolean;
  from: string;
  to?: string;
  prints: {
    count: number;
    link: string;
  };
}

export interface Mp {
  id: number;
  active: boolean;
  firstName: string;
  lastName: string;
  secondName?: string;
  firstLastName: string;
  lastFirstName: string;
  accusativeName: string;
  genitiveName: string;
  birthDate: string;
  birthLocation: string;
  club: string;
  districtName: string;
  districtNum: number;
  educationLevel: string;
  email: string;
  numberOfVotes: number;
  profession: string;
  voivodeship: string;
}

export interface Club {
  id: string;
  name: string;
  membersCount: number;
  email: string;
  fax: string;
  phone: string;
}

export interface CommitteeMember {
  id: number;
  lastFirstName: string;
  club: string;
  function: string;
}

export interface Committee {
  code: string;
  name: string;
  nameGenitive: string;
  type: string;
  appointmentDate: string;
  compositionDate: string;
  phone: string;
  scope?: string;
  members: CommitteeMember[];
  subCommittees?: string[];
}

export interface Link {
  href: string;
  rel: string;
}

export interface InterpellationAttachment {
  URL: string;
  lastModified: string;
  name: string;
}

export interface InterpellationReply {
  key: string;
  from: string;
  receiptDate: string;
  lastModified: string;
  onlyAttachment: boolean;
  prolongation: boolean;
  links: Link[];
  attachments?: InterpellationAttachment[];
}

export interface InterpellationRecipient {
  name: string;
  sent: string;
  answerDelayedDays?: number;
}

export interface Interpellation {
  num: number;
  term: number;
  title: string;
  sentDate: string;
  receiptDate: string;
  lastModified: string;
  from: string[];
  to: string[];
  answerDelayedDays?: number;
  links: Link[];
  recipientDetails?: InterpellationRecipient[];
  replies?: InterpellationReply[];
}

export interface Print {
  number: string;
  term: number;
  title: string;
  documentDate: string;
  deliveryDate: string;
  changeDate: string;
  attachments: string[];
  processPrint?: string[];
}

export interface Proceeding {
  number: number;
  title: string;
  current: boolean;
  dates: string[];
  /** HTML. */
  agenda?: string;
  /** HTML. */
  currentAffairs?: string;
  /** HTML. */
  schedule?: string;
  /** HTML. */
  votings?: string;
}

export interface VotingOption {
  option: string;
  optionIndex: number;
  votes: number;
}

export interface Voting {
  votingNumber: number;
  term: number;
  sitting: number;
  sittingDay: number;
  date: string;
  title: string;
  topic: string;
  description: string;
  kind: string;
  majorityType: string;
  majorityVotes?: number;
  yes: number;
  no: number;
  abstain: number;
  notParticipating: number;
  present?: number;
  againstAll?: number;
  totalVoted: number;
  links: Link[];
  votingOptions?: VotingOption[];
}

export interface VotingVote {
  MP: number;
  club: string;
  firstName: string;
  lastName: string;
  secondName?: string;
  /** YES, NO, ABSTAIN, ABSENT; VOTE_VALID for votings on a list. */
  vote: string;
  /** Votes per option for votings on a list, keyed by option index. */
  listVotes?: Record<string, string>;
}

export interface VotingDetails extends Voting {
  votes: VotingVote[];
}

export interface VotingStat {
  sitting: number;
  date: string;
  numVotings: number;
  numVoted: number;
  numMissed: number;
  absenceExcuse: boolean;
}

export interface MpVote {
  votingNumber: number;
  date: string;
  title: string;
  topic?: string;
  description?: string;
  kind: string;
  vote: string;
  listVotes?: Record<string, string>;
}

export interface CommitteeSitting {
  num: number;
  code: string;
  date: string;
  startDateTime?: string;
  endDateTime?: string;
  status: string;
  room?: string;
  remote?: boolean;
  closed?: boolean;
  /** HTML. */
  agenda?: string;
  video?: Video[];
}

export interface LegislativeProcess {
  number: string;
  term: number;
  title: string;
  titleFinal?: string;
  documentType: string;
  documentTypeEnum: string;
  documentDate: string;
  processStartDate: string;
  changeDate: string;
  closureDate?: string;
  ELI?: string;
  UE?: string;
  address?: string;
  displayAddress?: string;
  passed?: boolean;
  shortenProcedure?: boolean;
  urgencyStatus: string;
  webGeneratedDate?: string;
  printsConsideredJointly?: string[];
  links?: Link[];
}

export interface Video {
  unid: string;
  title: string;
  type: string;
  room: string;
  startDateTime: string;
  transcribe: boolean;
  videoLink: string;
  playerLink: string;
  playerLinkIFrame: string;
  otherVideoLinks?: string[];
}

export interface Statement {
  /** 0 is always the course of the sitting. */
  num: number;
  name: string;
  function: string;
  /** MP id if the speaker is an MP, 0 otherwise. */
  memberID: number;
  rapporteur: boolean;
  secretary: boolean;
  unspoken: boolean;
  startDateTime?: string;
  endDateTime?: string;
}

export interface StatementList {
  proceedingNum: number;
  date: string;
  statements: Statement[];
}

export interface WrittenQuestion {
  num?: number;
  term?: number;
  title?: string;
  sentDate?: string;
  receiptDate?: string;
  lastModified?: string;
  from?: string[];
  to?: string[];
  links?: Link[];
  [key: string]: unknown;
}

export interface BilateralGroup {
  id: number;
  name: string;
  engName?: string;
  appointmentDate?: string;
  [key: string]: unknown;
}

/** A reference from one act to another in the ELI API, e.g. to an amending act. */
export interface ActReference {
  /** ELI of the referenced act, e.g. DU/2024/1. */
  id: string;
  art?: string;
  date?: string;
}

/** An act as listed by the ELI API. */
export interface ActInfo {
  /** European Legislation Identifier: publisher/year/position, e.g. DU/2024/1. */
  ELI: string;
  address: string;
  publisher: string;
  year: number;
  volume: number;
  pos: number;
  title: string;
  displayAddress: string;
  type: string;
  status: string;
  /** Date of the act. */
  announcementDate?: string;
  /** Date of publication in the journal. */
  promulgation?: string;
  changeDate: string;
  textHTML: boolean;
  textPDF: boolean;
  /** IN_FORCE, NOT_IN_FORCE or UNKNOWN. */
  inForce?: string;
  entryIntoForce?: string;
}

/** Full details of an act from the ELI API. */
export interface Act extends ActInfo {
  validFrom?: string;
  repealDate?: string;
  expirationDate?: string;
  legalStatusDate?: string;
  comments?: string;
  releasedBy?: string[];
  authorizedBody?: string[];
  obligated?: string[];
  keywords?: string[];
  keywordsNames?: string[];
  previousTitle?: string[];
  directives?: { address: string; title: string; date: string }[];
  texts?: { fileName: string; type: string }[];
  prints?: { term: number; number: string; link?: string; linkPrintAPI?: string; linkProcessAPI?: string }[];
  /** References by type, e.g. "Akty zmieniające" (amending acts) or "Inf. o tekście jednolitym" (consolidated texts). */
  references?: Record<string, ActReference[]>;
}

export interface ActList {
  totalCount: number;
  offset: number;
  count: number;
  items: Act[];
}

/** A unit of an act (book, chapter, article, paragraph, ...) in the structure from the ELI API. */
export interface ActUnit {
  id: string;
  /** book, part, titl, bran, chpt, schp, arti, pass, para, pint, lett, ... */
  type: string;
  /** Number or name of the unit within its parent, e.g. 415 or 18_3_a for Art. 18^3a; absent for top-level parts. */
  name?: string;
  title?: string;
  children?: ActUnit[];
}
