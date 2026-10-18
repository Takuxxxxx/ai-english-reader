import { getDb } from "../db/index.js";
import { logger } from "../utils/logger.js";

const FLAG_KEY = "dedupeExactDuplicatesDone";

/**
 * One-time cleanup: remove articles that exactly duplicate an earlier (title + body).
 * Guarded by a settings flag so it only ever runs once. New duplicates can no longer
 * be created because the generator reuses an existing article instead of inserting.
 */
export async function dedupeArticlesOnce(): Promise<void> {
  const db = await getDb();
  const flag = await db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [FLAG_KEY] });
  const done = (flag.rows[0] as unknown as { value: string } | undefined)?.value;
  if (done === "1") return;

  const res = await db.execute("SELECT id, title, body FROM articles ORDER BY id ASC");
  const seen = new Set<string>();
  const removed: number[] = [];
  for (const r of res.rows as unknown as Array<{ id: number; title: string; body: string }>) {
    const key = `${r.title}\u0000${r.body}`;
    if (seen.has(key)) removed.push(Number(r.id));
    else seen.add(key);
  }

  for (const id of removed) {
    await db.execute({ sql: "DELETE FROM article_word_cache WHERE article_id = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM word_lookups WHERE article_id = ?", args: [id] });
    await db.execute({
      sql: "UPDATE vocabulary SET source_article_id = NULL WHERE source_article_id = ?",
      args: [id],
    });
    await db.execute({ sql: "DELETE FROM articles WHERE id = ?", args: [id] });
  }

  await db.execute({
    sql: "INSERT INTO settings (key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value = '1'",
    args: [FLAG_KEY],
  });
  if (removed.length > 0) logger.info(`Dedupe: removed ${removed.length} duplicate article(s)`);
}
