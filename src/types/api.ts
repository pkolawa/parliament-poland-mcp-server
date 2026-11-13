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
