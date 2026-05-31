import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool ??= new Pool({
    connectionString: normalizeDatabaseUrl(databaseUrl),
    ssl: isLocalDatabaseUrl(databaseUrl) ? false : undefined,
  });

  return pool;
}

export async function sql<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const result = await getPool().query<T>(text, values);
  return result.rows;
}

function normalizeDatabaseUrl(databaseUrl: string) {
  if (isLocalDatabaseUrl(databaseUrl)) return databaseUrl;

  try {
    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get("sslmode");
    if (!sslMode || ["prefer", "require", "verify-ca"].includes(sslMode)) {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

function isLocalDatabaseUrl(databaseUrl: string) {
  return databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
}
