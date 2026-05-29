import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    const url = process.env.DATABASE_URL ?? "file:./data/verifications.db";
    client = createClient({ url });
  }
  return client;
}

export async function initDb(): Promise<void> {
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS verification_requests (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      locale TEXT DEFAULT 'en',
      created_at TEXT NOT NULL,
      consumed_at TEXT
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS download_sessions (
      email TEXT PRIMARY KEY,
      verified_at TEXT NOT NULL
    )
  `);
}
