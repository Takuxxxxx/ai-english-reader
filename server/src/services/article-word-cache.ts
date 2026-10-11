import { getDb } from "../db/index.js";
import { lookupDict } from "./word-explainer.js";
import { logger } from "../utils/logger.js";

/** Precompute built-in dictionary meanings for every unique word in an article. */
export async function precacheArticleWords(articleId: number, paragraphs: string[]): Promise<number> {
  const words = new Set<string>();
  for (const paragraph of paragraphs) {
    for (const match of paragraph.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)) {
      words.add(match[0].toLowerCase());
    }
  }

  const entries = [...words].flatMap((word) => {
    const explanation = lookupDict(word);
    return explanation ? [{ word, explanation }] : [];
  });
  if (!entries.length) return 0;

  const db = await getDb();
  await db.batch(
    entries.map(({ word, explanation }) => ({
      sql: `INSERT OR IGNORE INTO article_word_cache (article_id, word, lemma, meaning_ja, pos, example_en)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [articleId, word, explanation.lemma, explanation.meaningJa, explanation.pos, explanation.exampleEn || null],
    }))
  );
  return entries.length;
}

/** Fill the new cache for articles created before this feature was deployed. */
export async function backfillArticleWordCache(): Promise<void> {
  const db = await getDb();
  const res = await db.execute(
    `SELECT a.id, a.body FROM articles a
     WHERE NOT EXISTS (SELECT 1 FROM article_word_cache c WHERE c.article_id = a.id)`
  );
  const rows = res.rows as unknown as Array<{ id: number; body: string }>;
  let count = 0;
  for (const row of rows) {
    try {
      count += await precacheArticleWords(Number(row.id), JSON.parse(row.body) as string[]);
    } catch (err) {
      logger.warn(`Word cache backfill failed for article ${row.id}`, { error: String(err) });
    }
  }
  if (count) logger.info(`Backfilled ${count} dictionary entries across ${rows.length} articles`);
}
