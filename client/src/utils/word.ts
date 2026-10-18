export interface BrowserMeaning {
  meaningJa: string;
  pos: string | null;
  exampleEn: string | null;
  lemma: string | null;
}

function posJa(posEn: string): string {
  const p = posEn.toLowerCase();
  if (p.includes("noun")) return "名詞";
  if (p.includes("verb")) return "動詞";
  if (p.includes("adjective")) return "形容詞";
  if (p.includes("adverb")) return "副詞";
  return posEn || "その他";
}

/**
 * Resolve a word meaning straight from the browser. The user's home/phone IP is not
 * rate-limited the way Render's shared datacenter IP is, so this succeeds where the
 * server falls back. Same free, keyless sources as the server: dictionaryapi.dev + MyMemory + gtx.
 */
export async function lookupWordInBrowser(word: string): Promise<BrowserMeaning | null> {
  const enc = encodeURIComponent(word);
  const text = (r: Response | null) => (r && r.ok ? r.text() : null);

  const [dictText, mmText, gtText] = await Promise.all([
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${enc}`).then(text).catch(() => null),
    fetch(`https://api.mymemory.translated.net/get?q=${enc}&langpair=en|ja`).then(text).catch(() => null),
    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${enc}`)
      .then(text)
      .catch(() => null),
  ]);

  let dict: Array<{
    word?: string;
    meanings?: Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string; example?: string }> }>;
  }> | null = null;
  if (dictText) {
    try {
      dict = JSON.parse(dictText);
    } catch {
      dict = null;
    }
  }

  let mmGloss = "";
  if (mmText) {
    try {
      const tr = JSON.parse(mmText) as { responseData?: { translatedText?: string } };
      mmGloss = (tr.responseData?.translatedText ?? "").trim();
    } catch {
      mmGloss = "";
    }
  }

  let gtGloss = "";
  if (gtText) {
    try {
      const g = JSON.parse(gtText) as Array<Array<Array<string | null>>>;
      gtGloss = (g?.[0] ?? []).map((s) => s?.[0] ?? "").join("").trim();
    } catch {
      gtGloss = "";
    }
  }

  const lower = word.toLowerCase();
  const gloss =
    (mmGloss && mmGloss.toLowerCase() !== lower ? mmGloss : "") ||
    (gtGloss && gtGloss.toLowerCase() !== lower ? gtGloss : "");

  const first = dict?.[0];
  const meaning = first?.meanings?.[0];
  const enDef = meaning?.definitions?.[0]?.definition ?? "";
  const meaningJa = gloss || (enDef ? `（英語の定義: ${enDef}）` : "");
  if (!meaningJa) return null;

  return {
    meaningJa,
    pos: meaning?.partOfSpeech ? posJa(meaning.partOfSpeech) : null,
    exampleEn: meaning?.definitions?.[0]?.example ?? null,
    lemma: first?.word ?? null,
  };
}
