import { DICT } from "./dictionary.js";
import { generateJsonWithRetry, currentProvider } from "./llm.js";
import { loadPrompt } from "../prompts/loader.js";
import { logger } from "../utils/logger.js";

export interface WordExplanation {
  word: string;
  lemma: string;
  pos: string;
  meaningJa: string;
  exampleEn: string;
  source: "dict" | "llm" | "web" | "fallback";
}

const CONTRACTIONS: Record<string, string> = {
  "don't": "do", "doesn't": "do", "didn't": "do",
  "can't": "can", "couldn't": "could", "won't": "will",
  "wouldn't": "would", "shouldn't": "should", "mustn't": "must",
  "isn't": "be", "aren't": "be", "wasn't": "be", "weren't": "be",
  "haven't": "have", "hasn't": "have", "hadn't": "have",
  "i'm": "I", "you're": "you", "he's": "he", "she's": "she",
  "it's": "it", "we're": "we", "they're": "they",
};

/** Return the DICT key for a raw word, or null if unknown. Handles inflections. */
export function lemmatize(raw: string): string | null {
  let w = raw.toLowerCase().trim().replace(/'s$/, "");
  if (!w) return null;
  if (DICT[w]) return w;
  if (CONTRACTIONS[w] && DICT[CONTRACTIONS[w]]) return CONTRACTIONS[w];
  const tryFind = (...cands: string[]): string | null => {
    for (const c of cands) if (DICT[c]) return c;
    return null;
  };
  // -ically -> stem (dramatically -> dramatic)
  if (w.endsWith("ically") && w.length > 8) {
    const hit = tryFind(w.slice(0, -4));
    if (hit) return hit;
  }
  // -ably -> able, -ibly -> ible (considerably -> considerable)
  if ((w.endsWith("ably") || w.endsWith("ibly")) && w.length > 6) {
    const hit = tryFind(w.slice(0, -1) + "e");
    if (hit) return hit;
  }
  // adverbs: -ily -> y, -ly strip
  if (w.endsWith("ily") && w.length > 5) {
    const hit = tryFind(w.slice(0, -3) + "y");
    if (hit) return hit;
  }
  if (w.endsWith("ly") && w.length > 4) {
    const hit = tryFind(w.slice(0, -2));
    if (hit) return hit;
  }
  // -al adjectives -> base / base+e (cultural -> culture; exact entries win)
  if (w.endsWith("al") && w.length > 4 && !w.endsWith("ual")) {
    const base = w.slice(0, -2);
    const hit = tryFind(base, base + "e");
    if (hit) return hit;
  }
  // comparatives: -ier -> y, -er / -est strip
  if (w.endsWith("ier") && w.length > 4) {
    const hit = tryFind(w.slice(0, -3) + "y");
    if (hit) return hit;
  }
  if (w.endsWith("est") && w.length > 5) {
    const hit = tryFind(w.slice(0, -3), w.slice(0, -2));
    if (hit) return hit;
  }
  if (w.endsWith("er") && w.length > 4) {
    const hit = tryFind(w.slice(0, -2), w.slice(0, -1));
    if (hit) return hit;
  }
  // plurals / 3rd person singular
  if (w.endsWith("ies") && w.length > 4) {
    const hit = tryFind(w.slice(0, -3) + "y");
    if (hit) return hit;
  }
  if (w.endsWith("es") && w.length > 3) {
    const hit = tryFind(w.slice(0, -2), w.slice(0, -1));
    if (hit) return hit;
  }
  if (w.endsWith("s") && w.length > 2 && !w.endsWith("ss")) {
    const hit = tryFind(w.slice(0, -1));
    if (hit) return hit;
  }
  // past: -ied -> y, -ed / -d, doubled consonant
  if (w.endsWith("ied") && w.length > 4) {
    const hit = tryFind(w.slice(0, -3) + "y");
    if (hit) return hit;
  }
  if (w.endsWith("ed") && w.length > 3) {
    const base = w.slice(0, -2);
    const doubled =
      base.length > 1 && base[base.length - 1] === base[base.length - 2]
        ? base.slice(0, -1)
        : null;
    const hit = tryFind(base, w.slice(0, -1), doubled ?? "");
    if (hit) return hit;
  }
  // -ing: strip, +e, undoubled consonant
  if (w.endsWith("ing") && w.length > 4) {
    const base = w.slice(0, -3);
    const doubled =
      base.length > 1 && base[base.length - 1] === base[base.length - 2]
        ? base.slice(0, -1)
        : null;
    const hit = tryFind(base, base + "e", doubled ?? "");
    if (hit) return hit;
  }
  return null;
}

export function lookupDict(raw: string): WordExplanation | null {
  const key = lemmatize(raw);
  if (!key) return null;
  const [lemma, pos, meaningJa, exampleEn] = DICT[key];
  return { word: raw.toLowerCase(), lemma, pos, meaningJa, exampleEn, source: "dict" };
}

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

/** Free APIs rate-limit shared datacenter IPs, so retry a couple of times with backoff. */
async function fetchJsonRetry(url: string, ms: number, attempts = 2): Promise<unknown> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchJson(url, ms);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(800 * (i + 1));
    }
  }
  throw lastErr;
}

const POS_JA = (posEn: string): string => {
  const p = posEn.toLowerCase();
  if (p.includes("noun")) return "名詞";
  if (p.includes("verb")) return "動詞";
  if (p.includes("adjective")) return "形容詞";
  if (p.includes("adverb")) return "副詞";
  return posEn || "その他";
};

/** Free, keyless web fallback: dictionaryapi.dev (POS/example) + MyMemory / Google gloss (JA). */
async function explainViaWeb(word: string): Promise<WordExplanation | null> {
  const dictApi = (async () => {
    try {
      const data = (await fetchJsonRetry(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
        5000
      )) as Array<{
        word?: string;
        meanings?: Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string; example?: string }> }>;
      }>;
      const first = data?.[0];
      const meaning = first?.meanings?.[0];
      const def = meaning?.definitions?.[0]?.definition;
      if (!def) return null;
      return {
        lemma: first.word ?? word,
        pos: POS_JA(meaning?.partOfSpeech ?? ""),
        exampleEn: meaning?.definitions?.[0]?.example ?? "",
        enDef: def,
      };
    } catch (err) {
      logger.warn("dictionaryapi lookup failed", { word, error: String(err) });
      return null;
    }
  })();

  const mymemoryGloss = (async () => {
    try {
      const tr = (await fetchJsonRetry(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|ja`,
        5000
      )) as { responseData?: { translatedText?: string } };
      const t = (tr.responseData?.translatedText ?? "").trim();
      if (!t || t.toLowerCase() === word.toLowerCase()) return null;
      return t;
    } catch (err) {
      logger.warn("mymemory gloss failed", { word, error: String(err) });
      return null;
    }
  })();

  const googleGloss = (async () => {
    try {
      const data = (await fetchJsonRetry(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(word)}`,
        5000
      )) as Array<Array<Array<string | null>>>;
      const t = (data?.[0] ?? []).map((s) => s?.[0] ?? "").join("").trim();
      if (!t || t.toLowerCase() === word.toLowerCase()) return null;
      return t;
    } catch {
      return null;
    }
  })();

  const [apiRes, mmGloss, gtGloss] = await Promise.all([dictApi, mymemoryGloss, googleGloss]);
  const gloss = mmGloss ?? gtGloss;
  if (!apiRes && !gloss) {
    logger.warn("web dictionary lookup failed", { word });
    return null;
  }
  return {
    word,
    lemma: apiRes?.lemma ?? word,
    pos: apiRes?.pos ?? "その他",
    meaningJa: gloss ?? (apiRes ? `（英語の定義: ${apiRes.enDef}）` : ""),
    exampleEn: apiRes?.exampleEn ?? "",
    source: "web",
  };
}

async function explainViaLlm(word: string, sentence: string): Promise<WordExplanation> {
  const template = loadPrompt("word-explanation");
  const system = "You are a helpful assistant for English learners. Always return valid JSON only.";
  const user = template.replaceAll("{{WORD}}", word).replaceAll("{{SENTENCE}}", sentence || "(no context)");
  const parsed = (await generateJsonWithRetry(system, user, "word")) as Partial<WordExplanation>;
  return {
    word,
    lemma: String(parsed.lemma ?? word),
    pos: String(parsed.pos ?? "その他"),
    meaningJa: String(parsed.meaningJa ?? "（意味を取得できませんでした）"),
    exampleEn: String(parsed.exampleEn ?? ""),
    source: "llm",
  };
}

/** Main entry: dict -> LLM (if configured) -> free web -> honest fallback. */
export async function explainWord(rawWord: string, sentence: string): Promise<WordExplanation> {
  const word = rawWord.toLowerCase().trim();
  const fromDict = lookupDict(word);
  if (fromDict) return fromDict;

  const provider = currentProvider();
  if (provider !== "mock") {
    try {
      return await explainViaLlm(word, sentence);
    } catch (err) {
      logger.warn("LLM word explanation failed, trying web fallback", { error: String(err) });
    }
  }
  const viaWeb = await explainViaWeb(word);
  if (viaWeb) return viaWeb;
  return {
    word,
    lemma: word,
    pos: "その他",
    meaningJa: "（意味を取得できませんでした。通信状況を確認して、もう一度タップしてください）",
    exampleEn: "",
    source: "fallback",
  };
}
