import { Hono } from "hono";
import { getDb } from "../db/index.js";

const topics = new Hono();

topics.get("/", async (c) => {
  const db = await getDb();
  const res = await db.execute(
    `SELECT t.id, t.name, t.display_order AS displayOrder, t.enabled,
      (SELECT COUNT(*) FROM articles a WHERE a.topic_id = t.id AND a.is_read = 0) AS unreadCount,
      (SELECT title FROM articles a WHERE a.topic_id = t.id ORDER BY id DESC LIMIT 1) AS latestTitle
     FROM topics t ORDER BY t.display_order`
  );
  return c.json(res.rows);
});

topics.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return c.json({ error: "name is required" }, 400);
  const db = await getDb();
  try {
    const max = await db.execute("SELECT COALESCE(MAX(display_order), -1) AS m FROM topics");
    const m = Number((max.rows[0] as Record<string, unknown>)?.m ?? -1);
    const r = await db.execute({
      sql: "INSERT INTO topics (name, display_order, enabled) VALUES (?, ?, 1)",
      args: [name, m + 1],
    });
    return c.json({ id: Number(r.lastInsertRowid), name }, 201);
  } catch {
    return c.json({ error: "Topic already exists" }, 409);
  }
});

topics.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const db = await getDb();
  if (body.name !== undefined)
    await db.execute({ sql: "UPDATE topics SET name = ? WHERE id = ?", args: [String(body.name), id] });
  if (body.enabled !== undefined)
    await db.execute({ sql: "UPDATE topics SET enabled = ? WHERE id = ?", args: [body.enabled ? 1 : 0, id] });
  if (body.displayOrder !== undefined)
    await db.execute({
      sql: "UPDATE topics SET display_order = ? WHERE id = ?",
      args: [Number(body.displayOrder), id],
    });
  return c.json({ ok: true });
});

topics.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM topics WHERE id = ?", args: [id] });
  return c.json({ ok: true });
});

topics.post("/reorder", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const ids = (body.ids ?? []) as number[];
  const db = await getDb();
  await db.batch(
    ids.map((tid, i) => ({ sql: "UPDATE topics SET display_order = ? WHERE id = ?", args: [i, tid] }))
  );
  return c.json({ ok: true });
});

export default topics;
