export type Confidence = "high" | "medium" | "low";

export type Race = {
  id: string;
  cycle: number;
  state: string;
  district: string;
  office: string;
  name: string;
  competitiveness?: string | null;
};

export type Candidate = {
  id: string;
  fecCandidateId: string;
  name: string;
  party?: string | null;
  office: string;
  state: string;
  district?: string | null;
  electionYear?: number | null;
  incumbentChallengeStatus?: string | null;
  totalReceiptsCycle?: number | null;
  totalDisbursementsCycle?: number | null;
  cashOnHandLatest?: number | null;
  cashOnHandAsOf?: string | null;
  individualContributionPct?: number | null;
  pacContributionPct?: number | null;
  totalsUpdatedAt?: string | null;
  generalElectionStatus?: string | null;
  bioguideId?: string | null;
  photoUrl?: string | null;
  wikipediaUrl?: string | null;
  raceId?: string | null;
  sourceUrl?: string | null;
};

export type Committee = {
  id: string;
  fecCommitteeId: string;
  name: string;
  committeeType?: string | null;
  designation?: string | null;
  party?: string | null;
  treasurerName?: string | null;
  candidateId?: string | null;
  raceId?: string | null;
  discoveredVia?: string | null;
  firstFileDate?: string | null;
  sourceUrl?: string | null;
};

export type Filing = {
  sourceId: string;
  committeeId?: string | null;
  fecCommitteeId?: string | null;
  reportType?: string | null;
  coverageStartDate?: string | null;
  coverageEndDate?: string | null;
  receiptDate?: string | null;
  totalReceipts?: number | null;
  totalDisbursements?: number | null;
  cashOnHand?: number | null;
  sourceUrl?: string | null;
  raw: unknown;
};

export type Transaction = {
  sourceId: string;
  committeeId?: string | null;
  fecCommitteeId?: string | null;
  contributorName?: string | null;
  contributorNameNormalized?: string | null;
  contributorEmployer?: string | null;
  contributorEmployerNormalized?: string | null;
  contributorOccupation?: string | null;
  amount: number;
  transactionDate?: string | null;
  transactionType?: string | null;
  memoText?: string | null;
  sourceUrl?: string | null;
  raw: unknown;
};

export type IndependentExpenditure = {
  sourceId: string;
  spenderCommitteeId?: string | null;
  fecCommitteeId?: string | null;
  candidateId?: string | null;
  fecCandidateId?: string | null;
  raceId?: string | null;
  supportOpposeIndicator?: string | null;
  amount: number;
  expenditureDate?: string | null;
  purpose?: string | null;
  sourceUrl?: string | null;
  raw: unknown;
};

export type Signal = {
  id?: string;
  dedupeKey: string;
  signalType: string;
  headline: string;
  whyItMatters: string;
  candidateId?: string | null;
  candidateName?: string | null;
  candidateParty?: string | null;
  candidateState?: string | null;
  candidateDistrict?: string | null;
  candidateIncumbentChallengeStatus?: string | null;
  committeeId?: string | null;
  committeeName?: string | null;
  raceId?: string | null;
  raceName?: string | null;
  state?: string | null;
  office?: string | null;
  amount?: number | null;
  signalDate: string;
  sourceUrl?: string | null;
  confidence: Confidence;
  status: string;
  dataFreshness: string;
  metadata?: Record<string, unknown>;
};

export type RaceRating = {
  raceId: string;
  sourceName: string;
  sourceUrl?: string | null;
  rating: string;
  ratingDate?: string | null;
  rationale?: string | null;
};

export type SavedFilter = {
  id: string;
  name: string;
  ownerEmail: string;
  filterJson: Record<string, string>;
  cadence: "daily" | "hourly" | "off";
  lastSentAt?: string | null;
  createdAt: string;
};

export type ValidationIssue = {
  entityType: string;
  sourceId?: string | null;
  severity: "warning" | "error";
  rule: string;
  message: string;
  sourceUrl?: string | null;
  raw?: unknown;
};

export type IngestionRun = {
  id: string;
  source: string;
  scope: string;
  mode?: string;
  status: string;
  windowStart?: string | null;
  windowEnd?: string | null;
  state?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  recordsSeen: number;
  recordsInserted: number;
  recordsUpdated: number;
  errors: unknown[];
  metadata: Record<string, unknown>;
};

export type EndpointFreshness = {
  endpoint: string;
  status: string;
  recordsFetched: number;
  validationIssuesCount: number;
  completedAt: string;
};
