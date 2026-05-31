import { sql, getPool, hasDatabase } from "@/src/lib/db/client";
import type { SavedFilter } from "@/src/lib/types";

type SavedFilterRow = {
  id: string;
  name: string;
  owner_email: string;
  filter_json: Record<string, string>;
  cadence: "daily" | "hourly" | "off";
  last_sent_at: string | Date | null;
  created_at: string | Date;
};

export type SavedFilterInput = {
  name: string;
  ownerEmail: string;
  filterJson: Record<string, string>;
  cadence: "daily" | "hourly" | "off";
};

export async function createSavedFilter(input: SavedFilterInput) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required to save filters.");
  const rows = await sql<SavedFilterRow>(
    `
      insert into saved_filters (name, owner_email, filter_json, cadence)
      values ($1, $2, $3, $4)
      returning *
    `,
    [input.name, input.ownerEmail, JSON.stringify(input.filterJson), input.cadence],
  );
  return mapSavedFilter(rows[0]);
}

export async function getSavedFilter(id: string) {
  if (!hasDatabase()) return null;
  const rows = await sql<SavedFilterRow>("select * from saved_filters where id = $1", [id]);
  return rows[0] ? mapSavedFilter(rows[0]) : null;
}

export async function listDueSavedFilters(now = new Date()) {
  if (!hasDatabase()) return [];
  const rows = await sql<SavedFilterRow>(
    `
      select *
      from saved_filters
      where cadence <> 'off'
        and (
          last_sent_at is null
          or (cadence = 'hourly' and last_sent_at <= $1::timestamptz - interval '1 hour')
          or (cadence = 'daily' and last_sent_at <= $1::timestamptz - interval '1 day')
        )
      order by last_sent_at nulls first, created_at
    `,
    [now.toISOString()],
  );
  return rows.map(mapSavedFilter);
}

export async function markSavedFilterSent(id: string, sentAt = new Date()) {
  await getPool().query("update saved_filters set last_sent_at = $2 where id = $1", [
    id,
    sentAt.toISOString(),
  ]);
}

function mapSavedFilter(row: SavedFilterRow): SavedFilter {
  return {
    id: row.id,
    name: row.name,
    ownerEmail: row.owner_email,
    filterJson: row.filter_json,
    cadence: row.cadence,
    lastSentAt: toIso(row.last_sent_at),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  };
}

function toIso(value: string | Date | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}
