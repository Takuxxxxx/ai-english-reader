import { Hono } from "hono";
import { getDb } from "../db/index.js";
import { explainWord } from "../services/word-explainer.js";
import { handleError } from "../utils/logger.js";

const lookup = new Hono();

interface CachedRow {
  id: number;
  word: string;
  lemma: string | null;
  context_sentence: string | null;
  meaning_ja: string | null;
  pos: string | null;
  example_en: string | null;
}

/** Tap a word -> explanation (DB cache first, then dict/LLM/web). Records history per article. */
lookup.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const raw = String(body.word ?? "").trim();
  const sentence = String(body.sentence ?? "").slice(0, 1000);
  const articleId = body.articleId != null ? Number(body.articleId) : null;

  const m = raw.match(/[A-Za-z][A-Za-z'\-]*[A-Za-z]|[A-Za-z]/);
  if (!m) return c.json({ error: "English word is required" }, 400);
  const word = m[0].toLowerCase();

  try {
    const db = await getDb();
    const cacheRes =
      articleId != null
        ? await db.execute({
            sql: "SELECT * FROM word_lookups WHERE article_id = ? AND word = ? AND COALESCE(context_sentence,'') = COALESCE(?,'') ORDER BY id DESC LIMIT 1",
            args: [articleId, word, sentence || null],
          })
        : await db.execute({
            sql: "SELECT * FROM word_lookups WHERE article_id IS NULL AND word = ? AND COALESCE(context_sentence,'') = COALESCE(?,'') ORDER BY id DESC LIMIT 1",
            args: [word, sentence || null],
          });
    const cached = cacheRes.rows[0] as unknown as CachedRow | undefined;

    if (cached) {
      return c.json({
        word: cached.word,
        lemma: cached.lemma,
        contextSentence: cached.context_sentence,
        meaningJa: cached.meaning_ja,
        pos: cached.pos,
        exampleEn: cached.example_en,
        cached: true,
        autoSaved: articleId != null,
      });
    }

    const ex = await explainWord(word, sentence);
    await db.execute({
      sql: "INSERT INTO word_lookups (article_id, word, lemma, context_sentence, meaning_ja, pos, example_en) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [articleId, word, ex.lemma, sentence || null, ex.meaningJa, ex.pos, ex.exampleEn],
    });

    // Auto-save to vocabulary when looked up from an article (dedupe by word+article).
    let autoSaved = false;
    if (articleId != null && ex.source !== "fallback") {
      const exists = await db.execute({
        sql: "SELECT id FROM vocabulary WHERE word = ? AND source_article_id = ?",
        args: [word, articleId],
      });
      if (exists.rows.length === 0) {
        await db.execute({
          sql: "INSERT INTO vocabulary (word, pos, meaning_ja, example_en, source_article_id) VALUES (?, ?, ?, ?, ?)",
          args: [word, ex.pos, ex.meaningJa, ex.exampleEn, articleId],
        });
      }
      autoSaved = true;
    }

    return c.json({ ...ex, contextSentence: sentence || null, cached: false, autoSaved });
  } catch (err) {
    handleError("POST /api/lookup", err);
    return c.json({ error: err instanceof Error ? err.message : "Lookup failed" }, 500);
  }
});

/** Lookup history for one article ("words looked up in this article"). */
lookup.get("/", async (c) => {
  const articleId = Number(c.req.query("articleId"));
  if (!articleId) return c.json({ error: "articleId is required" }, 400);
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT id, word, lemma, context_sentence AS contextSentence, meaning_ja AS meaningJa, pos, example_en AS exampleEn, created_at AS createdAt FROM word_lookups WHERE article_id = ? ORDER BY id ASC",
    args: [articleId],
  });
  return c.json(res.rows);
});

export default lookup;
