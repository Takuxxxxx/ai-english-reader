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

/** Tap a word -> precomputed article cache, tap history, then dict/LLM/web. */
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
    if (articleId != null) {
      const precomputed = await db.execute({
        sql: "SELECT word, lemma, meaning_ja, pos, example_en FROM article_word_cache WHERE article_id = ? AND word = ?",
        args: [articleId, word],
      });
      const item = precomputed.rows[0] as unknown as {
        word: string;
        lemma: string | null;
        meaning_ja: string;
        pos: string | null;
        example_en: string | null;
      } | undefined;
      if (item) {
        const cachedHistory = await db.execute({
          sql: "SELECT * FROM word_lookups WHERE article_id = ? AND word = ? AND COALESCE(context_sentence,'') = COALESCE(?,'') ORDER BY id DESC LIMIT 1",
          args: [articleId, word, sentence || null],
        });
        const previous = cachedHistory.rows[0] as unknown as CachedRow | undefined;
        if (!previous) {
          await db.execute({
            sql: "INSERT INTO word_lookups (article_id, word, lemma, context_sentence, meaning_ja, pos, example_en) VALUES (?, ?, ?, ?, ?, ?, ?)",
            args: [articleId, word, item.lemma, sentence || null, item.meaning_ja, item.pos, item.example_en],
          });
        }
        const exists = await db.execute({
          sql: "SELECT id FROM vocabulary WHERE word = ? AND source_article_id = ?",
          args: [word, articleId],
        });
        if (!exists.rows.length) {
          await db.execute({
            sql: "INSERT INTO vocabulary (word, pos, meaning_ja, example_en, source_article_id) VALUES (?, ?, ?, ?, ?)",
            args: [word, item.pos, item.meaning_ja, item.example_en, articleId],
          });
        }
        return c.json({
          word: item.word,
          lemma: item.lemma,
          contextSentence: sentence || null,
          meaningJa: item.meaning_ja,
          pos: item.pos,
          exampleEn: item.example_en,
          source: "dict",
          cached: true,
          autoSaved: true,
        });
      }
    }
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

/**
 * Save a meaning the browser resolved itself (its IP is not rate-limited like Render's),
 * so the shared article cache serves it instantly for everyone afterwards.
 */
lookup.put("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const articleId = body.articleId != null ? Number(body.articleId) : null;
  const rawWord = String(body.word ?? "").trim().toLowerCase();
  const meaningJa = String(body.meaningJa ?? "").trim();
  if (articleId == null || !rawWord || !meaningJa) {
    return c.json({ error: "articleId, word and meaningJa are required" }, 400);
  }
  const pos = body.pos != null ? String(body.pos) : null;
  const lemma = body.lemma != null ? String(body.lemma) : null;
  const exampleEn = body.exampleEn != null ? String(body.exampleEn) : null;
  const sentence = body.sentence != null ? String(body.sentence).slice(0, 1000) : null;

  try {
    const db = await getDb();
    await db.execute({
      sql: `INSERT OR IGNORE INTO article_word_cache (article_id, word, lemma, meaning_ja, pos, example_en)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [articleId, rawWord, lemma, meaningJa, pos, exampleEn],
    });
    const history = await db.execute({
      sql: "SELECT id FROM word_lookups WHERE article_id = ? AND word = ? AND COALESCE(context_sentence,'') = COALESCE(?,'') LIMIT 1",
      args: [articleId, rawWord, sentence],
    });
    if (!history.rows.length) {
      await db.execute({
        sql: "INSERT INTO word_lookups (article_id, word, lemma, context_sentence, meaning_ja, pos, example_en) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [articleId, rawWord, lemma, sentence, meaningJa, pos, exampleEn],
      });
    }
    return c.json({ ok: true });
  } catch (err) {
    handleError("PUT /api/lookup", err);
    return c.json({ error: "Save failed" }, 500);
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
