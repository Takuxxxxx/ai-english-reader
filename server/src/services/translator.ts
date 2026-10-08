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

/** Free, keyless web translation: Google gtx endpoint, MyMemory as fallback. */
async function translateWeb(text: string): Promise<string> {
  const chunks = splitChunks(text, 800);
  const out: string[] = [];
  for (const ch of chunks) {
    let done = "";
    try {
      const data = (await fetchJson(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(ch)}`,
        15000
      )) as Array<Array<Array<string | null>>>;
      done = (data?.[0] ?? []).map((s) => s?.[0] ?? "").join("");
    } catch (err) {
      logger.warn("google translate failed, trying mymemory", { error: String(err) });
    }
    if (!done) {
      const small = splitChunks(ch, 450);
      const parts: string[] = [];
      for (const s of small) {
        const tr = (await fetchJson(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(s)}&langpair=en|ja`,
          15000
        )) as { responseData?: { translatedText?: string } };
        parts.push(tr.responseData?.translatedText ?? s);
      }
      done = parts.join("");
    }
    out.push(done || ch);
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
  const out: string[] = [];
  for (const p of paras) out.push(await translateWeb(p));
  return out;
}
