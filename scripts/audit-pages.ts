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
      { path: "/spenders", text: "Top stored outside spenders" },
      { path: "/records/schedule-e", text: "Schedule E records" },
      { path: "/records/schedule-e?position=O&minAmount=25000", text: "Filtered by" },
      { path: "/status", text: "Publishability read" },
      { path: "/methodology", text: "Methodology" },
      { path: "/docs", text: "North Star" },
      { path: `/candidates/${dynamicRoutes.candidateId}`, text: "Candidate" },
      { path: `/races/${dynamicRoutes.raceId}`, text: "Candidate cohort" },
      { path: `/committees/${dynamicRoutes.committeeId}`, text: "Committee" },
    ];

    for (const check of checks) {
      await assertRoute(check);
    }
    console.log(`Page audit passed for ${checks.length} routes.`);
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
      raceId: "2026-IN-05-H",
    };
  }

  const pool = getPool();
  const [candidate, committee, race] = await Promise.all([
    pool.query<{ id: string }>("select id from candidates order by total_receipts_cycle desc nulls last, id limit 1"),
    pool.query<{ id: string }>("select id from committees order by name, id limit 1"),
    pool.query<{ id: string }>("select id from races order by state, office, district nulls first, id limit 1"),
  ]);

  return {
    candidateId: candidate.rows[0]?.id ?? "cand-H6IN05101",
    committeeId: committee.rows[0]?.id ?? "cmte-C00890501",
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
