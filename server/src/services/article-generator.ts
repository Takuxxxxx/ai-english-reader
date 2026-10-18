import { getDb } from "../db/index.js";
import { generateJsonWithRetry, currentProvider } from "./llm.js";
import { mockGenerate } from "./mock.js";
import { loadPrompt } from "../prompts/loader.js";
import { logger } from "../utils/logger.js";
import { precacheArticleWords } from "./article-word-cache.js";
import { translateParagraphs } from "./translator.js";

export type Difficulty = "easier" | "just-right" | "challenging";

export interface GeneratedArticle {
  title: string;
  body: string[];
  topic: string;
  wordCount: number;
}

function countWords(paras: string[]): number {
  return paras.join(" ").split(/\s+/).filter(Boolean).length;
}

async function targetWordsFromSettings(): Promise<number> {
  const db = await getDb();
  const res = await db.execute("SELECT value FROM settings WHERE key = 'articleLength'");
  const row = res.rows[0] as unknown as { value: string } | undefined;
  const n = parseInt(row?.value ?? "300", 10);
  return [200, 300, 400, 500].includes(n) ? n : 300;
}

async function difficultyFromSettings(): Promise<Difficulty> {
  const db = await getDb();
  const res = await db.execute("SELECT value FROM settings WHERE key = 'difficulty'");
  const row = res.rows[0] as unknown as { value: string } | undefined;
  const v = row?.value ?? "just-right";
  return v === "easier" || v === "challenging" ? v : "just-right";
}

export async function generateArticleForTopic(topicName: string): Promise<GeneratedArticle> {
  const db = await getDb();
  const topicRes = await db.execute({ sql: "SELECT * FROM topics WHERE name = ?", args: [topicName] });
  const topic = topicRes.rows[0] as unknown as { id: number; name: string } | undefined;
  if (!topic) throw new Error(`Topic not found: ${topicName}`);

  const pastRes = await db.execute({
    sql: "SELECT title FROM articles WHERE topic_id = ? ORDER BY id DESC LIMIT 20",
    args: [topic.id],
  });
  const pastTitles = (pastRes.rows as unknown as Array<{ title: string }>).map((r) => r.title);

  const target = await targetWordsFromSettings();
  const difficulty = await difficultyFromSettings();

  if (currentProvider() === "mock") {
    const m = mockGenerate(topicName, pastTitles, target);
    const wc = countWords(m.body);
    const saved = await saveArticle(topic.id, topicName, m.title, m.body, wc, difficulty);
    logger.info(`Mock article generated for ${topicName}: ${m.title}`);
    return { ...saved, wordCount: wc };
  }

  const template = loadPrompt("article-generation");
  const prompt = template
    .replaceAll("{{DIFFICULTY}}", difficulty)
    .replaceAll("{{TOPIC}}", topicName)
    .replaceAll("{{WORD_COUNT}}", String(target))
    .replaceAll("{{PAST_TITLES}}", pastTitles.length > 0 ? pastTitles.map((t) => `- ${t}`).join("\n") : "(none yet)");

  const system = "You are a helpful writing assistant for English learners. Always return valid JSON only.";
  const parsed = (await generateJsonWithRetry(system, prompt, "article")) as {
    title?: string;
    body?: string[];
    topic?: string;
  };
  if (!parsed.title || !Array.isArray(parsed.body) || parsed.body.length === 0) {
    throw new Error("Model returned invalid article JSON (missing title/body)");
  }
  const body = parsed.body.map(String);
  const wc = countWords(body);
  const saved = await saveArticle(topic.id, topicName, String(parsed.title), body, wc, difficulty);
  logger.info(`Article generated for ${topicName} via ${currentProvider()}: ${parsed.title}`);
  return { ...saved, wordCount: wc };
}

async function saveArticle(
  topicId: number,
  topic: string,
  title: string,
  body: string[],
  wordCount: number,
  level: string
): Promise<Omit<GeneratedArticle, "wordCount"> & { title: string; body: string[]; topic: string }> {
  const db = await getDb();
  const inserted = await db.execute({
    sql: "INSERT INTO articles (topic_id, title, body, word_count, level, is_new) VALUES (?, ?, ?, ?, ?, 1)",
    args: [topicId, title, JSON.stringify(body), wordCount, level],
  });
  const articleId = Number(inserted.lastInsertRowid);
  try {
    const cached = await precacheArticleWords(articleId, body);
    logger.info(`Pre-cached ${cached} dictionary entries for article ${articleId}`);
  } catch (err) {
    // Saving the article must succeed even if building the optional word cache fails.
    logger.warn(`Word-cache precomputation failed for article ${articleId}`, { error: String(err) });
  }
  // Fire-and-forget: build the Japanese translation so readers never wait on it.
  // Not awaited so generation returns promptly even when the free APIs are slow.
  void pretranslateArticle(articleId, body);
  return { title, body, topic };
}

async function pretranslateArticle(articleId: number, body: string[]): Promise<void> {
  try {
    const translations = await translateParagraphs(body);
    const done = translations.filter(Boolean).length;
    if (done > 0) {
      const db = await getDb();
      await db.execute({
        sql: "UPDATE articles SET translation = ? WHERE id = ?",
        args: [JSON.stringify(translations), articleId],
      });
    }
    logger.info(`Pre-translated ${done}/${body.length} paragraphs for article ${articleId}`);
  } catch (err) {
    logger.warn(`Pre-translation failed for article ${articleId}`, { error: String(err) });
  }
}
