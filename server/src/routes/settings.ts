import { Hono } from "hono";
import { getDb } from "../db/index.js";
import { providerStatus } from "../services/llm.js";

const settings = new Hono();

settings.get("/", async (c) => {
  const db = await getDb();
  const res = await db.execute("SELECT key, value FROM settings");
  const obj: Record<string, string> = {};
  for (const r of res.rows as unknown as Array<{ key: string; value: string }>) obj[r.key] = r.value;
  return c.json({ settings: obj, llm: providerStatus() });
});

settings.put("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const db = await getDb();
  await db.batch(
    Object.entries(body as Record<string, unknown>).map(([k, v]) => ({
      sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      args: [k, typeof v === "string" ? v : JSON.stringify(v)],
    }))
  );
  return c.json({ ok: true });
});

export default settings;
