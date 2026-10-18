import { Hono } from "hono";
import { getDb } from "../db/index.js";
import { generateArticleForTopic } from "../services/article-generator.js";
import { translateParagraphs } from "../services/translator.js";
import { handleError } from "../utils/logger.js";

const articles = new Hono();

function toArticle(row: Record<string, unknown>) {
  return {
    id: row.id,
    topicId: row.topic_id,
    topic: row.topic_name,
    title: row.title,
    body: JSON.parse(String(row.body)),
    wordCount: row.word_count,
    level: row.level,
    createdAt: row.created_at,
    isRead: Number(row.is_read) === 1,
    readAt: row.read_at,
    isNew: Number(row.is_new ?? 1) === 1,
  };
}

articles.get("/", async (c) => {
  const topic = c.req.query("topic");
  const db = await getDb();
  const res = topic
    ? await db.execute({
        sql: `SELECT a.*, t.name AS topic_name FROM articles a JOIN topics t ON t.id = a.topic_id
              WHERE t.name = ? ORDER BY a.id DESC LIMIT 100`,
        args: [topic],
      })
    : await db.execute(
        `SELECT a.*, t.name AS topic_name FROM articles a JOIN topics t ON t.id = a.topic_id
         ORDER BY a.id DESC LIMIT 100`
      );
  return c.json((res.rows as Array<Record<string, unknown>>).map(toArticle));
});

articles.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT a.*, t.name AS topic_name FROM articles a JOIN topics t ON t.id = a.topic_id WHERE a.id = ?`,
    args: [id],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(toArticle(row));
});

/** Japanese translations per paragraph (generated once, then cached in DB). */
articles.get("/:id/translation", async (c) => {
  const id = Number(c.req.param("id"));
  try {
    const db = await getDb();
    const res = await db.execute({ sql: "SELECT body, translation FROM articles WHERE id = ?", args: [id] });
    const row = res.rows[0] as unknown as { body: string; translation: string | null } | undefined;
    if (!row) return c.json({ error: "Not found" }, 404);
    const paras = JSON.parse(row.body) as string[];
    if (c.req.query("cachedOnly") === "1") {
      const cached = row.translation ? (JSON.parse(row.translation) as Array<string | null>) : [];
      const translations = paras.map((_, i) => cached[i] ?? null);
      return c.json({ translations, cached: translations.every(Boolean) });
    }
    if (row.translation) {
      const cached = JSON.parse(row.translation) as Array<string | null>;
      const missing = cached.some((t) => !t);
      if (!missing) return c.json({ translations: cached, cached: true });
      // Partial cache: translate only the missing paragraphs.
      const todo: Array<{ i: number; p: string }> = [];
      paras.forEach((p, i) => {
        if (!cached[i]) todo.push({ i, p });
      });
      const filled = [...cached];
      for (const { i, p } of todo) {
        try {
          filled[i] = await translateParagraphs([p]).then((r) => r[0]);
        } catch (err) {
          handleError(`translate para ${i} of article ${id}`, err);
        }
      }
      await db.execute({
        sql: "UPDATE articles SET translation = ? WHERE id = ?",
        args: [JSON.stringify(filled), id],
      });
      return c.json({ translations: filled, cached: false });
    }
    const results: Array<string | null> = [];
    for (const p of paras) {
      try {
        const [t] = await translateParagraphs([p]);
        results.push(t ?? null);
      } catch (err) {
        handleError(`translate para of article ${id}`, err);
        results.push(null);
      }
    }
    await db.execute({
      sql: "UPDATE articles SET translation = ? WHERE id = ?",
      args: [JSON.stringify(results), id],
    });
    return c.json({ translations: results, cached: false });
  } catch (err) {
    handleError(`GET /api/articles/${id}/translation`, err);
    return c.json({ error: err instanceof Error ? err.message : "Translation failed" }, 500);
  }
});

/**
 * Save translations obtained by the browser (its IP is not rate-limited like Render's).
 * Accepts nulls so partial progress is kept, and merges with anything already cached.
 */
articles.put("/:id/translation", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const translations = body.translations as unknown;
  const ok =
    Array.isArray(translations) &&
    translations.some((t) => typeof t === "string" && t.trim()) &&
    translations.every((t) => t == null || typeof t === "string");
  if (!ok) {
    return c.json({ error: "translations must be an array of strings (nulls allowed)" }, 400);
  }
  try {
    const db = await getDb();
    const res = await db.execute({ sql: "SELECT body, translation FROM articles WHERE id = ?", args: [id] });
    const row = res.rows[0] as unknown as { body: string; translation: string | null } | undefined;
    if (!row) return c.json({ error: "Not found" }, 404);
    const paras = JSON.parse(row.body) as string[];
    const incoming = translations as Array<string | null>;
    if (incoming.length !== paras.length) {
      return c.json({ error: "translations length mismatch" }, 400);
    }
    const existing = row.translation ? (JSON.parse(row.translation) as Array<string | null>) : [];
    const merged = paras.map((_, i) => {
      const next = incoming[i];
      if (typeof next === "string" && next.trim()) return next;
      const prev = existing[i];
      return typeof prev === "string" && prev.trim() ? prev : null;
    });
    await db.execute({
      sql: "UPDATE articles SET translation = ? WHERE id = ?",
      args: [JSON.stringify(merged), id],
    });
    return c.json({ ok: true, translations: merged });
  } catch (err) {
    handleError(`PUT /api/articles/${id}/translation`, err);
    return c.json({ error: "Save failed" }, 500);
  }
});

articles.post("/generate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const topic = String(body.topic ?? "").trim();
  if (!topic) return c.json({ error: "topic is required" }, 400);
  try {
    const article = await generateArticleForTopic(topic);
    const db = await getDb();
    const res = await db.execute({
      sql: `SELECT a.*, t.name AS topic_name FROM articles a JOIN topics t ON t.id = a.topic_id WHERE a.title = ? ORDER BY a.id DESC LIMIT 1`,
      args: [article.title],
    });
    const row = res.rows[0] as Record<string, unknown>;
    return c.json(toArticle(row), 201);
  } catch (err) {
    handleError("POST /api/articles/generate", err);
    return c.json({ error: err instanceof Error ? err.message : "Generation failed" }, 500);
  }
});

// TEMPORARY: remove exact-content duplicate articles (title + body). Deleted after one-off cleanup.
articles.post("/maintenance/dedupe", async (c) => {
  if (c.req.header("x-maintenance-token") !== "623340e50d1e19f08024") {
    return c.json({ error: "forbidden" }, 403);
  }
  try {
    const db = await getDb();
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
    return c.json({ removed: removed.length, remaining: seen.size, removedIds: removed });
  } catch (err) {
    handleError("POST /api/articles/maintenance/dedupe", err);
    return c.json({ error: "dedupe failed" }, 500);
  }
});

articles.patch("/:id/read", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const db = await getDb();
  const sets: string[] = ["is_new = 0"];
  const vals: Array<number | string | null> = [];
  if (body.isRead !== undefined) {
    const isRead = body.isRead !== false;
    sets.push("is_read = ?", "read_at = ?");
    vals.push(isRead ? 1 : 0, isRead ? new Date().toISOString() : null);
  }
  await db.execute({ sql: `UPDATE articles SET ${sets.join(", ")} WHERE id = ?`, args: [...vals, id] });
  return c.json({ ok: true });
});

export default articles;
