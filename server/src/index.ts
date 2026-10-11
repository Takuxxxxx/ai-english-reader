import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb } from "./db/index.js";
import { logger, handleError } from "./utils/logger.js";
import topics from "./routes/topics.js";
import articles from "./routes/articles.js";
import settings from "./routes/settings.js";
import lookup from "./routes/lookup.js";
import vocabulary from "./routes/vocabulary.js";
import { providerStatus } from "./services/llm.js";
import { startScheduler } from "./services/scheduler.js";

const app = new Hono();

app.use("*", cors());

app.get("/api/health", async (c) => {
  try {
    await getDb();
    return c.json({ ok: true, ...providerStatus(), time: new Date().toISOString() });
  } catch (err) {
    handleError("health check", err);
    return c.json({ ok: false }, 500);
  }
});

app.route("/api/topics", topics);
app.route("/api/articles", articles);
app.route("/api/settings", settings);
app.route("/api/lookup", lookup);
app.route("/api/vocabulary", vocabulary);

// Serve the built frontend (client/dist) so phones can use a single URL.
// API routes above take precedence; unknown non-API paths fall back to index.html.
const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "client", "dist");
if (existsSync(join(distDir, "index.html"))) {
  app.use("/*", serveStatic({ root: distDir }));
  app.get("*", (c) => c.html(readFileSync(join(distDir, "index.html"), "utf-8")));
  logger.info(`Serving frontend from ${distDir}`);
} else {
  logger.warn(`Frontend dist not found at ${distDir} (run "npm run build -w client")`);
}

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  handleError("unhandled", err);
  return c.json({ error: "Internal server error" }, 500);
});

const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "0.0.0.0";
logger.info(`Starting server on ${hostname}:${port} (provider=${providerStatus().provider})`);
await getDb(); // ensure migrations run at boot

if (process.env.DISABLE_SCHEDULER !== "1") startScheduler();

serve({ fetch: app.fetch, port, hostname });
