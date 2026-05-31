import { spawn } from "node:child_process";
import { loadEnvConfig } from "@next/env";
import { hasDatabase } from "@/src/lib/db/client";
import { getPool } from "@/src/lib/db/client";

loadEnvConfig(process.cwd());

const port = Number(process.env.PAGE_AUDIT_PORT ?? "3107");
const baseUrl = process.env.PAGE_AUDIT_BASE_URL ?? `http://127.0.0.1:${port}`;

type RouteCheck = {
  path: string;
  text: string;
};

async function main() {
  const dynamicRoutes = await dynamicRouteIds();
  const server = process.env.PAGE_AUDIT_BASE_URL ? null : startServer();
  try {
    await waitForServer();
    const checks: RouteCheck[] = [
      { path: "/", text: "Source-linked FEC record feed" },
      { path: "/review", text: "Records that need human attention" },
      { path: "/spending", text: "Outside spending watch" },
      { path: "/spending", text: "Local evidence row" },
      { path: "/spenders", text: "Top stored outside spenders" },
      { path: "/raised", text: "Top stored fundraisers" },
      { path: "/records/schedule-e", text: "Schedule E records" },
      { path: "/records/schedule-e?position=O&minAmount=25000", text: "Filtered by" },
      { path: "/status", text: "Publishability read" },
      { path: "/methodology", text: "Methodology" },
      { path: "/docs", text: "North Star" },
      { path: `/candidates/${dynamicRoutes.candidateId}`, text: "Candidate" },
      ...(dynamicRoutes.noSignalCandidateId
        ? [{ path: `/candidates/${dynamicRoutes.noSignalCandidateId}`, text: "Check coverage gaps" }]
        : []),
      { path: `/races/${dynamicRoutes.raceId}`, text: "Candidate cohort" },
      { path: `/committees/${dynamicRoutes.committeeId}`, text: "Committee" },
    ];

    for (const check of checks) {
      await assertRoute(check);
    }
    await assertRoute({ path: "/api/signals/export.csv?status=review&sort=amount", text: "signal_date" });
    await assertJsonRoute("/api/signals/export.json?status=review&sort=amount");
    await assertRoute({ path: "/api/schedule-e/export.csv?position=O&minAmount=25000&targetParty=REP", text: "expenditure_date" });
    await assertJsonRoute("/api/schedule-e/export.json?position=O&minAmount=25000&targetParty=REP");
    await assertRoute({ path: "/api/races/export.csv?state=IN", text: "race_id" });
    await assertJsonRoute("/api/races/export.json?state=IN");
    await assertRoute({ path: "/api/spenders/export.csv", text: "committee_name" });
    await assertJsonRoute("/api/spenders/export.json");
    await assertRoute({ path: "/api/raised/export.csv", text: "candidate_name" });
    await assertJsonRoute("/api/raised/export.json");
    console.log(`Page audit passed for ${checks.length} routes and 10 export endpoints.`);
  } finally {
    if (server) {
      server.kill("SIGTERM");
    }
    if (hasDatabase()) {
      await getPool().end();
    }
  }
}

async function dynamicRouteIds() {
  if (!hasDatabase()) {
    return {
      candidateId: "cand-H6IN05101",
      committeeId: "cmte-C00890501",
      noSignalCandidateId: null,
      raceId: "2026-IN-05-H",
    };
  }

  const pool = getPool();
  const [candidate, committee, noSignalCandidate, race] = await Promise.all([
    pool.query<{ id: string }>("select id from candidates order by total_receipts_cycle desc nulls last, id limit 1"),
    pool.query<{ id: string }>("select id from committees order by name, id limit 1"),
    pool.query<{ id: string }>(`
      select c.id
      from candidates c
      left join signals s on s.candidate_id = c.id
      group by c.id
      having count(s.id) = 0
      order by c.total_receipts_cycle desc nulls last, c.id
      limit 1
    `),
    pool.query<{ id: string }>("select id from races order by state, office, district nulls first, id limit 1"),
  ]);

  return {
    candidateId: candidate.rows[0]?.id ?? "cand-H6IN05101",
    committeeId: committee.rows[0]?.id ?? "cmte-C00890501",
    noSignalCandidateId: noSignalCandidate.rows[0]?.id ?? null,
    raceId: race.rows[0]?.id ?? "2026-IN-05-H",
  };
}

function startServer() {
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status < 500) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function assertRoute({ path, text }: RouteCheck) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  const body = await response.text();
  if (!body.includes(text)) {
    throw new Error(`${path} did not include expected text: ${text}`);
  }
}

async function assertJsonRoute(path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  const body = await response.text();
  try {
    JSON.parse(body);
  } catch {
    throw new Error(`${path} did not return parseable JSON`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
