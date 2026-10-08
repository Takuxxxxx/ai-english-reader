import { createClient, type Client, type Row } from "@libsql/client";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { logger } from "../utils/logger.js";

let db: Client | null = null;
let migrated = false;

export const DEFAULT_TOPICS = [
  "Technology",
  "Education",
  "Science",
  "Health",
  "Travel",
  "Culture",
  "Environment",
  "Sports",
  "Business",
  "Daily Life",
];

function resolveUrl(): { url: string; authToken?: string } {
  if (process.env.TURSO_DATABASE_URL) {
    return { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN };
  }
  const filePath = process.env.DB_PATH ?? "./data/app.db";
  if (!filePath.startsWith("file:")) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return { url: "file:" + filePath };
  }
  return { url: filePath };
}

/** Get the shared client, running migrations + seeds once. */
export async function getDb(): Promise<Client> {
  if (db) {
    if (!migrated) {
      await migrate(db);
      migrated = true;
    }
    return db;
  }
  const { url, authToken } = resolveUrl();
  db = createClient({ url, authToken });
  logger.info(`DB connected: ${url.startsWith("file:") ? url : url.split("@")[0] + "@..."}`);
  await migrate(db);
  migrated = true;
  return db;
}

async function migrate(db: Client) {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      level TEXT NOT NULL DEFAULT 'just-right',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_read INTEGER NOT NULL DEFAULT 0,
      read_at TEXT,
      translation TEXT,
      is_new INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS word_lookups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
      word TEXT NOT NULL,
      lemma TEXT,
      context_sentence TEXT,
      meaning_ja TEXT,
      pos TEXT,
      example_en TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS vocabulary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      pos TEXT,
      meaning_ja TEXT,
      example_en TEXT,
      source_article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
      mastered INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS reading_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      wpm REAL
    )`,
    `CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      questions_json TEXT NOT NULL,
      score INTEGER,
      taken_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
  ]);

  const count = await db.execute("SELECT COUNT(*) AS c FROM topics");
  if (Number((count.rows[0] as Row)?.c ?? 0) === 0) {
    await db.batch(
      DEFAULT_TOPICS.map((name, i) => ({
        sql: "INSERT INTO topics (name, display_order, enabled) VALUES (?, ?, 1)",
        args: [name, i],
      }))
    );
    logger.info(`Seeded ${DEFAULT_TOPICS.length} default topics`);
  }

  const defaults: Record<string, string> = {
    articleLength: "300",
    difficulty: "just-right",
    fontSize: "medium",
    theme: "light",
    autoGenEnabled: "false",
    autoGenTime: "07:00",
    autoGenCount: "1",
    autoGenTopics: JSON.stringify(DEFAULT_TOPICS.slice(0, 3)),
  };
  for (const [k, v] of Object.entries(defaults)) {
    await db.execute({
      sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING",
      args: [k, v],
    });
  }
}

export async function closeDb() {
  db?.close();
  db = null;
  migrated = false;
}
