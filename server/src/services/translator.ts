import { generateJsonWithRetry, currentProvider } from "./llm.js";
import { loadPrompt } from "../prompts/loader.js";
import { logger } from "../utils/logger.js";

async function fetchJson(url: string, ms: number): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry a fetch a few times with backoff (free APIs rate-limit shared IPs). */
async function fetchJsonRetry(url: string, ms: number, attempts = 3): Promise<unknown> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchJson(url, ms);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(1200 * (i + 1));
    }
  }
  throw lastErr;
}

function splitChunks(text: string, maxLen: number): string[] {
  const sentences = text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? [text];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > maxLen && cur) {
      chunks.push(cur);
      cur = s;
    } else {
      cur += s;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function googleTranslate(text: string): Promise<string> {
  const data = (await fetchJsonRetry(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(text)}`,
    12000
  )) as Array<Array<Array<string | null>>>;
  const done = (data?.[0] ?? []).map((s) => s?.[0] ?? "").join("");
  if (!done) throw new Error("empty google translation");
  return done;
}

async function mymemoryTranslate(text: string): Promise<string> {
  const tr = (await fetchJsonRetry(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ja`,
    12000
  )) as { responseData?: { translatedText?: string } };
  const done = tr.responseData?.translatedText ?? "";
  if (!done) throw new Error("empty mymemory translation");
  return done;
}

/** Free, keyless web translation: Google gtx endpoint, MyMemory as fallback. */
async function translateWeb(text: string): Promise<string> {
  const chunks = splitChunks(text, 800);
  const out: string[] = [];
  for (const ch of chunks) {
    let done = "";
    try {
      done = await googleTranslate(ch);
    } catch (err) {
      logger.warn("google translate failed, trying mymemory", { error: String(err) });
    }
    if (!done) {
      try {
        done = await mymemoryTranslate(ch);
      } catch (err) {
        logger.warn("mymemory translate failed", { error: String(err) });
      }
    }
    if (!done) {
      try {
        done = await googleTranslate(ch);
      } catch (err) {
        logger.warn("google translate retry failed", { error: String(err) });
      }
    }
    if (!done) throw new Error("翻訳サービスが混み合っています。少し待ってからもう一度お試しください。");
    out.push(done);
  }
  return out.join("");
}

async function translateLlm(paras: string[]): Promise<string[]> {
  const template = loadPrompt("translation");
  const system = "You are a professional translator for English learners. Always return valid JSON only.";
  const user = template.replaceAll("{{PARAGRAPHS}}", paras.map((p, i) => `[${i + 1}] ${p}`).join("\n\n"));
  const parsed = (await generateJsonWithRetry(system, user, "article")) as { translations?: unknown };
  if (!Array.isArray(parsed.translations) || parsed.translations.length !== paras.length) {
    throw new Error("Model returned invalid translation JSON");
  }
  return parsed.translations.map(String);
}

/** Translate paragraphs to Japanese. LLM if configured, else free web APIs. */
export async function translateParagraphs(paras: string[]): Promise<string[]> {
  if (currentProvider() !== "mock") {
    try {
      return await translateLlm(paras);
    } catch (err) {
      logger.warn("LLM translation failed, falling back to web", { error: String(err) });
    }
  }
  // Free APIs rate-limit shared IPs; keep concurrency low (2) and fail fast with a clear message.
  const out = new Array<string>(paras.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(2, paras.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= paras.length) break;
      out[i] = await translateWeb(paras[i]);
    }
  });
  await Promise.all(workers);
  return out;
}
