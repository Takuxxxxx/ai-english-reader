import { Hono } from "hono";
import { getDb } from "../db/index.js";

const vocabulary = new Hono();

function toItem(r: Record<string, unknown>) {
  return {
    id: r.id,
    word: r.word,
    pos: r.pos,
    meaningJa: r.meaning_ja,
    exampleEn: r.example_en,
    sourceArticleId: r.source_article_id,
    sourceArticleTitle: r.source_title ?? null,
    mastered: Number(r.mastered) === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

vocabulary.get("/", async (c) => {
  const db = await getDb();
  const res = await db.execute(
    `SELECT v.*, a.title AS source_title FROM vocabulary v
     LEFT JOIN articles a ON a.id = v.source_article_id
     ORDER BY v.id DESC`
  );
  return c.json((res.rows as Array<Record<string, unknown>>).map(toItem));
});

vocabulary.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const word = String(body.word ?? "").trim().toLowerCase();
  const meaningJa = String(body.meaningJa ?? "").trim();
  if (!word || !meaningJa) return c.json({ error: "word and meaningJa are required" }, 400);
  const db = await getDb();
  const r = await db.execute({
    sql: "INSERT INTO vocabulary (word, pos, meaning_ja, example_en, source_article_id) VALUES (?, ?, ?, ?, ?)",
    args: [
      word,
      body.pos ? String(body.pos) : null,
      meaningJa,
      body.exampleEn ? String(body.exampleEn) : null,
      body.sourceArticleId != null ? Number(body.sourceArticleId) : null,
    ],
  });
  const row = await db.execute({
    sql: "SELECT * FROM vocabulary WHERE id = ?",
    args: [Number(r.lastInsertRowid)],
  });
  return c.json(toItem(row.rows[0] as Record<string, unknown>), 201);
});

vocabulary.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const db = await getDb();
  const fields: string[] = [];
  const vals: Array<number | string | null> = [];
  for (const [col, key] of [["word", "word"], ["pos", "pos"], ["meaning_ja", "meaningJa"], ["example_en", "exampleEn"], ["source_article_id", "sourceArticleId"], ["mastered", "mastered"]] as const) {
    if (body[key] !== undefined) {
      fields.push(`${col} = ?`);
      vals.push(key === "mastered" ? (body[key] ? 1 : 0) : (body[key] as number | string | null));
    }
  }
  if (fields.length === 0) return c.json({ error: "nothing to update" }, 400);
  fields.push("updated_at = datetime('now')");
  await db.execute({ sql: `UPDATE vocabulary SET ${fields.join(", ")} WHERE id = ?`, args: [...vals, id] });
  const row = await db.execute({ sql: "SELECT * FROM vocabulary WHERE id = ?", args: [id] });
  return c.json(toItem(row.rows[0] as Record<string, unknown>));
});

vocabulary.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM vocabulary WHERE id = ?", args: [id] });
  return c.json({ ok: true });
});

export default vocabulary;
