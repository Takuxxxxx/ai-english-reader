import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../stores/useStore";
import { api } from "../services/api";
import { speak, splitSentences } from "../utils/text";
import { lookupWordInBrowser } from "../utils/word";
import type { LookupResult, LookupHistoryItem } from "../types-word";

const FONT_SIZES = {
  small: "text-[1rem] leading-8",
  medium: "text-[1.1rem] leading-8",
  large: "text-[1.25rem] leading-9",
} as const;

type FontKey = keyof typeof FONT_SIZES;

/** Split a JA meaning into search candidates, longest first. */
function jaCandidates(meaning: string): string[] {
  const parts = meaning
    .split(/[・、，,／\/（）()「」『』［］[\]…\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^[A-Za-z][A-Za-z .'-]*$/.test(s));
  const filtered = parts.filter((s) => {
    if (s.length >= 2) return true;
    return /[\u4e00-\u9fff]/.test(s); // single kanji OK, single kana not
  });
  return [...new Set(filtered)].sort((a, b) => b.length - a.length);
}

/** Highlight all occurrences of the first matching candidate in JA text. */
function renderHighlighted(text: string, candidates: string[], keyPrefix: string): ReactNode {
  for (const c of candidates) {
    if (text.indexOf(c) === -1) continue;
    const nodes: ReactNode[] = [];
    let rest = text;
    let k = 0;
    let i = rest.indexOf(c);
    while (i !== -1) {
      if (i > 0) nodes.push(<span key={`${keyPrefix}-${k++}`}>{rest.slice(0, i)}</span>);
      nodes.push(
        <mark key={`${keyPrefix}-${k++}`} className="rounded bg-yellow-300 px-0.5 dark:bg-yellow-600">
          {c}
        </mark>
      );
      rest = rest.slice(i + c.length);
      i = rest.indexOf(c);
    }
    if (rest) nodes.push(<span key={`${keyPrefix}-${k++}`}>{rest}</span>);
    return <>{nodes}</>;
  }
  return text;
}

function InlineCard({ r, onClose }: { r: LookupResult; onClose: () => void }) {  return (
    <span className="mt-1 block rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-base dark:bg-amber-950">
      <span className="flex items-center gap-2">
        <span className="font-bold">{r.word}</span>
        <button onClick={() => speak(r.word)} className="rounded-full border bg-white px-2 py-0.5 text-sm dark:bg-slate-800" aria-label="発音を再生">
          🔊
        </button>
        <button onClick={onClose} className="ml-auto text-sm text-slate-500">
          閉じる ✕
        </button>
      </span>
      <span className="mt-0.5 block text-xs text-slate-500">
        {r.lemma && r.lemma !== r.word ? `原形: ${r.lemma} · ` : ""}
        {r.pos ?? ""}
      </span>
      <span className="mt-0.5 block text-lg leading-snug">{r.meaningJa}</span>
      {r.autoSaved && <span className="mt-1 block text-xs text-emerald-600">単語帳に自動保存しました ✓（不要なら単語帳で削除できます）</span>}
    </span>
  );
}

/** Browser-side gtx fallback (uses the user's home IP; server IPs can be rate-limited). */
async function translateInBrowser(text: string): Promise<string> {
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(text)}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as Array<Array<Array<string | null>>>;
  const done = (data?.[0] ?? []).map((s) => s?.[0] ?? "").join("");
  if (!done) throw new Error("empty translation");
  return done;
}

export default function ArticleView() {
  const { id } = useParams();
  const articleId = Number(id);
  const { currentArticle, loading, error, loadArticle, markRead } = useStore();

  const [fontKey, setFontKey] = useState<FontKey>("medium");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [openResult, setOpenResult] = useState<LookupResult | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [history, setHistory] = useState<LookupHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedHist, setExpandedHist] = useState<number | null>(null);
  const [translations, setTranslations] = useState<Array<string | null> | null>(null);
  const [translating, setTranslating] = useState(false);
  const [transError, setTransError] = useState<string | null>(null);
  const [shownTrans, setShownTrans] = useState<boolean[]>([]);
  const reqRef = useRef(0);

  /** Fill any missing paragraphs using the browser (its IP is not rate-limited). */
  const fillMissingInBrowser = useCallback(
    async (translations: Array<string | null>): Promise<Array<string | null>> => {
      const body = currentArticle?.body ?? [];
      const filled = [...translations];
      for (let i = 0; i < filled.length; i++) {
        if (!filled[i] && body[i]) {
          try {
            filled[i] = await translateInBrowser(body[i]);
          } catch {
            /* keep null */
          }
        }
      }
      return filled;
    },
    [currentArticle?.body]
  );

  const fetchTranslations = useCallback(async (): Promise<Array<string | null>> => {
    setTransError(null);
    let base: Array<string | null> = [];
    try {
      base = (await api.translation(articleId)).translations;
    } catch {
      base = (currentArticle?.body ?? []).map(() => null);
    }
    if (base.every((t) => t)) return base;
    const filled = await fillMissingInBrowser(base);
    if (filled.some((t) => t)) api.saveTranslation(articleId, filled).catch(() => {});
    if (filled.some((t) => t)) return filled;
    throw new Error("翻訳に失敗しました。もう一度お試しください。");
  }, [articleId, currentArticle?.body, fillMissingInBrowser]);

  useEffect(() => {
    if (articleId) {
      loadArticle(articleId);
      api.lookupHistory(articleId).then(setHistory).catch(() => {});
    }
  }, [articleId, loadArticle]);

  useEffect(() => {
    if (currentArticle?.isNew) {
      api.touchViewed(currentArticle.id).catch(() => {});
    }
  }, [currentArticle?.id, currentArticle?.isNew]);

  // Warm the translation cache in the background so "訳を見る" is instant.
  useEffect(() => {
    const article = currentArticle;
    if (!article?.body?.length) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api.translation(article.id, true);
        if (cancelled || r.translations.every((t) => t)) return;
        const filled = [...r.translations];
        for (let i = 0; i < filled.length; i++) {
          if (!filled[i] && article.body[i]) {
            try {
              filled[i] = await translateInBrowser(article.body[i]);
            } catch {
              /* keep null */
            }
          }
        }
        if (!cancelled && filled.some((t) => t)) {
          await api.saveTranslation(article.id, filled).catch(() => {});
        }
      } catch {
        /* offline: nothing we can do here */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentArticle?.id]);

  const toggleTrans = useCallback(
    async (pi: number) => {
      if (!translations && !translating) {
        setTranslating(true);
        try {
          const trans = await fetchTranslations();
          setTranslations(trans);
          setShownTrans(trans.map((_, i) => i === pi));
        } catch (err) {
          setTransError(err instanceof Error ? err.message : "翻訳に失敗しました。もう一度お試しください。");
        } finally {
          setTranslating(false);
        }
        return;
      }
      if (translations) {
        setShownTrans((prev) => {
          const next = [...prev];
          while (next.length < translations.length) next.push(false);
          next[pi] = !next[pi];
          return next;
        });
      }
    },
    [fetchTranslations, translations, translating]
  );

  const toggleAllTrans = useCallback(async () => {
    let trans = translations;
    if (!trans && !translating) {
      setTranslating(true);
      try {
        trans = await fetchTranslations();
        setTranslations(trans);
      } catch (err) {
        setTransError(err instanceof Error ? err.message : "翻訳に失敗しました。もう一度お試しください。");
      } finally {
        setTranslating(false);
      }
    }
    if (trans) {
      const allShown = trans.every((_, i) => shownTrans[i]);
      setShownTrans(trans.map(() => !allShown));
    }
  }, [fetchTranslations, translations, translating, shownTrans]);

  const openWord = useCallback(
    async (word: string, sentence: string, key: string) => {
      const myReq = ++reqRef.current;
      if (openKey === key) {
        setOpenKey(null);
        setOpenResult(null);
        return;
      }
      setOpenKey(key);
      setOpenResult(null);
      setLoadingKey(key);
      try {
        let r: LookupResult | null = null;
        try {
          r = await api.lookup(word, sentence, articleId);
        } catch {
          r = null;
        }
        if (reqRef.current !== myReq) return; // a newer tap superseded this one

        const weak =
          !r ||
          r.source === "fallback" ||
          !r.meaningJa ||
          r.meaningJa.startsWith("（意味を取得できませんでした") ||
          r.meaningJa.startsWith("（英語の定義");
        if (weak) {
          // Server hit the rate-limited path; resolve in the browser (user's own IP).
          try {
            const local = await lookupWordInBrowser(word);
            if (reqRef.current !== myReq) return;
            if (local) {
              setOpenResult({
                word,
                lemma: local.lemma ?? r?.lemma ?? null,
                pos: local.pos ?? r?.pos ?? null,
                meaningJa: local.meaningJa,
                exampleEn: local.exampleEn ?? r?.exampleEn ?? null,
                cached: false,
                autoSaved: true,
              });
              api
                .saveWordMeaning({
                  articleId,
                  word,
                  meaningJa: local.meaningJa,
                  pos: local.pos,
                  lemma: local.lemma,
                  exampleEn: local.exampleEn,
                  sentence,
                })
                .then(() => api.lookupHistory(articleId).then(setHistory).catch(() => {}))
                .catch(() => {});
              return;
            }
          } catch {
            /* fall through to whatever the server gave us */
          }
        }

        if (r) {
          setOpenResult(r);
          const h = await api.lookupHistory(articleId);
          if (reqRef.current !== myReq) return;
          setHistory(h);
        } else {
          setOpenResult({
            word,
            lemma: null,
            pos: null,
            meaningJa: "意味を取得できませんでした。通信状況を確認して、もう一度タップしてください。",
            exampleEn: null,
            cached: false,
            autoSaved: false,
          });
        }
      } finally {
        if (reqRef.current === myReq) setLoadingKey(null);
      }
    },
    [articleId, openKey]
  );

  if (loading) return <p className="p-6">読み込み中…</p>;
  if (error) return <p className="p-6 text-red-600">エラー: {error}</p>;
  if (!currentArticle) return <p className="p-6">記事が見つかりません</p>;

  const a = currentArticle;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <Link to={`/topics/${encodeURIComponent(a.topic)}`} className="text-sm text-slate-500 hover:underline">
        ← {a.topic}の記事一覧に戻る
      </Link>
      <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">{a.topic}</p>
      <h1 className="mt-1 text-2xl font-bold leading-snug sm:text-3xl">{a.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>
          {a.wordCount}語 · レベル: {a.level} · {new Date(a.createdAt + "Z").toLocaleString("ja-JP")}
        </span>
        <span className="ml-auto flex gap-1">
          {(Object.keys(FONT_SIZES) as FontKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setFontKey(k)}
              className={`rounded border px-2 py-0.5 ${fontKey === k ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : ""}`}
            >
              {k === "small" ? "小" : k === "medium" ? "中" : "大"}
            </button>
          ))}
        </span>
      </div>

      <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
        分からない単語をタップすると、その場に意味が表示されます（自動で単語帳にも保存）
      </p>

      <div className="mt-4">
        <div className="mb-3 flex items-center justify-end gap-2">
          {transError && <span className="text-xs text-red-600">{transError}</span>}
          <button onClick={toggleAllTrans} disabled={translating} className="rounded-lg border px-3 py-1 text-xs disabled:opacity-50">
            {translating ? "翻訳中…" : translations && translations.every((_, i) => shownTrans[i]) ? "訳をすべて隠す" : "訳をすべて表示"}
          </button>
        </div>
        {a.body.map((p, pi) => (
          <div key={pi} className="mb-5">
          <p className={`font-serif ${FONT_SIZES[fontKey]}`}>
            {splitSentences(p).map((sentence, si) => {
              const skey = `${pi}-${si}`;
              return (
                <span key={si} className="block">
                  <span>
                    {sentence.split(/(\s+)/).map((tok, i) => {
                      const m = tok.match(/^([^A-Za-z]*)([A-Za-z]+(?:'[A-Za-z]+)?)([^A-Za-z]*)$/);
                      if (!m) return <span key={i}>{tok}</span>;
                      const [, pre, core, suf] = m;
                      const wkey = `${skey}-${i}`;
                      const active = openKey === wkey;
                      return (
                        <span key={i}>
                          {pre}
                          <button
                            onClick={() => openWord(core, sentence, wkey)}
                            className={`rounded px-0.5 ${active ? "bg-amber-300 dark:bg-amber-700" : "hover:bg-amber-200 active:bg-amber-300 dark:hover:bg-amber-800"}`}
                          >
                            {core}
                          </button>
                          {suf}
                        </span>
                      );
                    })}{" "}
                  </span>
                  {loadingKey && loadingKey.startsWith(skey + "-") && <span className="block text-sm text-slate-500">調べています…</span>}
                  {openKey && openKey.startsWith(skey + "-") && openResult && (
                    <InlineCard r={openResult} onClose={() => { setOpenKey(null); setOpenResult(null); }} />
                  )}
                </span>
              );
            })}
          </p>
          <div className="mt-1">
            <button onClick={() => toggleTrans(pi)} disabled={translating} className="rounded border px-2 py-0.5 text-xs text-slate-500 disabled:opacity-50">
              {shownTrans[pi] ? "訳を隠す" : "訳を見る"}
            </button>
            {shownTrans[pi] && translations?.[pi] && (
              <p className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-sm leading-7 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {openKey?.startsWith(`${pi}-`) && openResult?.meaningJa
                  ? renderHighlighted(translations[pi], jaCandidates(openResult.meaningJa), `t${pi}`)
                  : translations[pi]}
              </p>
            )}
          </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-2">
        {!a.isRead ? (
          <button
            onClick={() => markRead(a.id, true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-slate-900"
          >
            読み終わった（既読にする）
          </button>
        ) : (
          <button onClick={() => markRead(a.id, false)} className="rounded-lg border px-4 py-2 text-sm">
            未読に戻す
          </button>
        )}
      </div>

      <div className="mt-6 rounded-xl border p-4">
        <button onClick={() => setHistoryOpen((v) => !v)} className="text-sm font-semibold">
          この記事で調べた単語（{history.length}）{historyOpen ? "▲" : "▼"}
        </button>
        {historyOpen && (
          <ul className="mt-2 divide-y text-sm">
            {history.map((h) => (
              <li key={h.id} className="py-1.5">
                <button
                  className="flex w-full items-center justify-between gap-2 text-left"
                  onClick={() => setExpandedHist(expandedHist === h.id ? null : h.id)}
                >
                  <span className="font-medium">{h.word}</span>
                  <span className="truncate text-slate-500">{h.meaningJa}</span>
                </button>
                {expandedHist === h.id && (
                  <div className="mt-1 rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800">
                    <p className="text-xs text-slate-500">
                      {h.lemma && h.lemma !== h.word ? `原形: ${h.lemma} · ` : ""}{h.pos ?? ""}
                    </p>
                    <p>{h.meaningJa}</p>
                  </div>
                )}
              </li>
            ))}
            {history.length === 0 && <p className="py-2 text-slate-500">まだありません</p>}
          </ul>
        )}
      </div>
    </div>
  );
}
