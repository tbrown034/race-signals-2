import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPool } from "@/src/lib/db/client";

export async function migrate() {
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const schema = await readFile(schemaPath, "utf8");
  await getPool().query(schema);
}
