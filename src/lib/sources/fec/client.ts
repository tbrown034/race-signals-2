const FEC_BASE_URL = "https://api.open.fec.gov/v1";
const FEC_WEB_BASE_URL = "https://www.fec.gov/data";
const DEFAULT_REQUEST_DELAY_MS = 4000;
const DEFAULT_MAX_RETRIES = 4;

let lastRequestAt = 0;

type FecListResponse<T> = {
  results: T[];
  pagination?: {
    pages: number;
    page: number;
    per_page: number;
    count: number;
  };
};

export type FecCandidate = {
  candidate_id: string;
  name: string;
  party?: string;
  office: string;
  state: string;
  district?: string;
  election_years?: number[];
  incumbent_challenge?: string;
  incumbent_challenge_full?: string;
};

export type FecCommittee = {
  committee_id: string;
  name: string;
  committee_type?: string;
  designation?: string;
  party?: string;
  treasurer_name?: string;
  candidate_ids?: string[];
};

export type FecReport = {
  report_year?: number;
  report_type?: string;
  coverage_start_date?: string;
  coverage_end_date?: string;
  receipt_date?: string;
  beginning_image_number?: string;
  file_number?: number;
  committee_id?: string;
  total_receipts?: number;
  total_disbursements?: number;
  cash_on_hand_end_period?: number;
};

export type FecScheduleE = {
  sub_id?: string;
  committee_id?: string;
  committee_name?: string;
  candidate_id?: string;
  candidate_name?: string;
  support_oppose_indicator?: string;
  expenditure_amount?: number;
  expenditure_date?: string;
  expenditure_description?: string;
};

function numberFromEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle() {
  const delay = numberFromEnv("FEC_REQUEST_DELAY_MS", DEFAULT_REQUEST_DELAY_MS);
  const now = Date.now();
  const waitFor = Math.max(0, lastRequestAt + delay - now);
  if (waitFor > 0) await wait(waitFor);
  lastRequestAt = Date.now();
}

function retryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }
  return Math.min(60000, 2000 * 2 ** attempt);
}

async function fecGet<T>(path: string, params: Record<string, string | number | undefined>) {
  const key = process.env.FEC_API_KEY;
  if (!key) throw new Error("FEC_API_KEY is not configured.");

  const url = new URL(`${FEC_BASE_URL}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("per_page", String(params.per_page ?? 100));

  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }

  const maxRetries = numberFromEnv("FEC_MAX_RETRIES", DEFAULT_MAX_RETRIES);

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    await throttle();
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (response.ok) {
      return (await response.json()) as FecListResponse<T>;
    }
    if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
      await wait(retryDelay(response, attempt));
      continue;
    }
    throw new Error(`FEC request failed ${response.status}: ${path}`);
  }

  throw new Error(`FEC request failed: ${path}`);
}

async function firstPages<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  maxPages?: number,
) {
  const records: T[] = [];
  for (let page = 1; maxPages === undefined || page <= maxPages; page += 1) {
    const data = await fecGet<T>(path, { ...params, page });
    records.push(...data.results);
    if (!data.pagination || page >= data.pagination.pages) break;
  }
  return records;
}

export type DateWindow = {
  startDate?: string;
  endDate?: string;
};

function dateWindowParams(window?: DateWindow) {
  return {
    min_date: window?.startDate,
    max_date: window?.endDate,
  };
}

export async function fetchCandidatesForOffice(
  office: "H" | "S",
  cycle: number,
  maxPages?: number,
  state?: string,
) {
  return firstPages<FecCandidate>(
    "/candidates/search/",
    {
      office,
      election_year: cycle,
      state,
      sort: "name",
    },
    maxPages,
  );
}

export async function fetchHouseCandidates(
  cycle: number,
  maxPages?: number,
  state?: string,
) {
  return fetchCandidatesForOffice("H", cycle, maxPages, state);
}

export async function fetchCandidatesForRace(state: string, district: string, cycle: number) {
  return firstPages<FecCandidate>(
    "/candidates/search/",
    {
      office: "H",
      state,
      district,
      election_year: cycle,
      sort: "name",
    },
    2,
  );
}

export async function fetchCommitteesForCandidate(candidateId: string) {
  return firstPages<FecCommittee>(
    `/candidate/${candidateId}/committees/`,
    {
      designation: "P",
    },
    2,
  );
}

export async function fetchCommittee(committeeId: string) {
  const records = await firstPages<FecCommittee>(
    `/committee/${committeeId}/`,
    {},
    1,
  );
  return records[0] ?? null;
}

export async function fetchReportsForCommittee(
  committeeId: string,
  cycle: number,
  window?: DateWindow,
) {
  return firstPages<FecReport>(
    `/committee/${committeeId}/reports/`,
    {
      report_year: cycle,
      sort: "-receipt_date",
      min_receipt_date: window?.startDate,
      max_receipt_date: window?.endDate,
    },
    2,
  );
}

export async function fetchIndependentExpendituresForCandidate(
  candidateId: string,
  cycle: number,
  window?: DateWindow,
) {
  return firstPages<FecScheduleE>(
    "/schedules/schedule_e/",
    {
      candidate_id: candidateId,
      two_year_transaction_period: cycle,
      sort: "-expenditure_date",
      ...dateWindowParams(window),
    },
    2,
  );
}

export function fecCandidateUrl(candidateId: string) {
  return `${FEC_WEB_BASE_URL}/candidate/${candidateId}/`;
}

export function fecCommitteeUrl(committeeId: string) {
  return `${FEC_WEB_BASE_URL}/committee/${committeeId}/`;
}

export function fecFilingUrl(imageOrFile?: string | number | null) {
  return imageOrFile ? `${FEC_WEB_BASE_URL}/filing/${imageOrFile}/` : `${FEC_WEB_BASE_URL}/filings/`;
}

export function fecIndependentExpendituresUrl(candidateId: string) {
  return `${FEC_WEB_BASE_URL}/independent-expenditures/?candidate_id=${candidateId}`;
}
