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
    if (row.translation) {
      return c.json({ translations: JSON.parse(row.translation), cached: true });
    }
    const paras = JSON.parse(row.body) as string[];
    const translations = await translateParagraphs(paras);
    await db.execute({
      sql: "UPDATE articles SET translation = ? WHERE id = ?",
      args: [JSON.stringify(translations), id],
    });
    return c.json({ translations, cached: false });
  } catch (err) {
    handleError(`GET /api/articles/${id}/translation`, err);
    return c.json({ error: err instanceof Error ? err.message : "Translation failed" }, 500);
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
