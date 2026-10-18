import { getDb } from "../db/index.js";
import { generateArticleForTopic } from "./article-generator.js";
import { logger } from "../utils/logger.js";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

async function getSetting(key: string, fallback: string): Promise<string> {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [key] });
  const row = res.rows[0] as unknown as { value: string } | undefined;
  return row?.value ?? fallback;
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [key, value],
  });
}

function jstNow(): Date {
  return new Date(Date.now() + JST_OFFSET_MS);
}

/** Generate one article per enabled topic that doesn't have one created today (JST). */
async function generateMissingDailyArticles(): Promise<number> {
  const enabled = await getSetting("autoGenerate", "1");
  if (enabled !== "1") return 0;
  const targetHour = Math.min(23, Math.max(0, parseInt(await getSetting("autoGenerateHour", "7"), 10) || 7));
  const now = jstNow();
  if (now.getUTCHours() < targetHour) return 0;

  const db = await getDb();
  const topicsRes = await db.execute("SELECT id, name FROM topics WHERE enabled = 1 ORDER BY display_order");
  const topics = topicsRes.rows as unknown as Array<{ id: number; name: string }>;

  // JST midnight today, as a UTC ISO timestamp for comparison with created_at (UTC).
  const jstMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0) - JST_OFFSET_MS);
  const cutoffIso = jstMidnight.toISOString().replace("T", " ").slice(0, 19);

  const todayJst = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("-");

  let generated = 0;
  for (const t of topics) {
    // Once a topic has been handled today, never generate for it again (also stops
    // regeneration churn when an article is deleted or the instance restarts).
    const flagKey = `autoGenLastDate:${t.id}`;
    if ((await getSetting(flagKey, "")) === todayJst) continue;

    const existing = await db.execute({
      sql: "SELECT COUNT(*) AS n FROM articles WHERE topic_id = ? AND created_at >= ?",
      args: [t.id, cutoffIso],
    });
    const n = Number((existing.rows[0] as unknown as { n: number }).n);
    if (n > 0) {
      await setSetting(flagKey, todayJst);
      continue;
    }
    try {
      await generateArticleForTopic(t.name);
      generated++;
      await setSetting(flagKey, todayJst);
      logger.info(`Auto-generated article for ${t.name}`);
    } catch (err) {
      logger.error(`Auto-generate failed for ${t.name}`, { error: String(err) });
    }
  }
  return generated;
}

let timer: NodeJS.Timeout | null = null;

/** Hourly tick while the instance is awake; Render free instances sleep, so this is best-effort. */
export function startScheduler(): void {
  if (timer) return;
  const run = () => {
    generateMissingDailyArticles().catch((err) => logger.error("scheduler tick failed", { error: String(err) }));
  };
  // First check shortly after boot (covers Render cold-start after target hour).
  setTimeout(run, 15_000);
  timer = setInterval(run, 60 * 60 * 1000);
  logger.info("Scheduler started (hourly check, JST-based daily generation)");
}
