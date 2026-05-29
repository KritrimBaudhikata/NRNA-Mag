import { mkdirSync } from "fs";
import { dirname, isAbsolute, join } from "path";
import { createClient, type Client, type Config } from "@libsql/client";

let client: Client | null = null;

function isLocalDatabaseUrl(url: string): boolean {
  return url.startsWith("file:");
}

function resolveLocalDatabaseUrl(configured?: string): string {
  const relative =
    configured?.replace(/^file:/, "").replace(/^\.\//, "") ??
    join("data", "verifications.db");

  const absolute = isAbsolute(relative)
    ? relative
    : join(/* turbopackIgnore: true */ process.cwd(), relative);

  mkdirSync(dirname(absolute), { recursive: true });

  const normalized = absolute.replace(/\\/g, "/");
  return `file:${normalized}`;
}

function resolveClientConfig(): Config {
  const configured = process.env.DATABASE_URL?.trim();

  if (!configured || isLocalDatabaseUrl(configured)) {
    return { url: resolveLocalDatabaseUrl(configured) };
  }

  const authToken =
    process.env.DATABASE_AUTH_TOKEN?.trim() ||
    process.env.TURSO_AUTH_TOKEN?.trim();

  if (!authToken) {
    throw new Error(
      "Remote DATABASE_URL (Turso) requires DATABASE_AUTH_TOKEN or TURSO_AUTH_TOKEN. " +
        "Create a token in the Turso dashboard → your database → Tokens.",
    );
  }

  return { url: configured, authToken };
}

export function getDb(): Client {
  if (!client) {
    client = createClient(resolveClientConfig());
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
