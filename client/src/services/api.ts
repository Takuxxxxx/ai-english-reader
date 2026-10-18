async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  topics: () => fetch("/api/topics").then(handle<import("../types").Topic[]>),
  articles: (topic?: string) =>
    fetch(topic ? `/api/articles?topic=${encodeURIComponent(topic)}` : "/api/articles").then(
      handle<import("../types").Article[]>
    ),
  article: (id: number) => fetch(`/api/articles/${id}`).then(handle<import("../types").Article>),
  generate: (topic: string) =>
    fetch("/api/articles/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    }).then(handle<import("../types").Article>),
  markRead: (id: number, isRead: boolean) =>
    fetch(`/api/articles/${id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead }),
    }).then(handle<{ ok: boolean }>),
  touchViewed: (id: number) =>
    fetch(`/api/articles/${id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then(handle<{ ok: boolean }>),
  translation: (id: number) =>
    fetch(`/api/articles/${id}/translation`).then(handle<{ translations: string[]; cached: boolean }>),
  saveTranslation: (id: number, translations: string[]) =>
    fetch(`/api/articles/${id}/translation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ translations }),
    }).then(handle<{ ok: boolean }>),
  getSettings: () =>
    fetch("/api/settings").then(
      handle<{ settings: Record<string, string>; llm: { provider: string; configured: boolean; missing: string[] } }>
    ),
  saveSettings: (values: Record<string, string>) =>
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).then(handle<{ ok: boolean }>),
  lookup: (word: string, sentence: string, articleId?: number) =>
    fetch("/api/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, sentence, articleId }),
    }).then(handle<import("../types-word").LookupResult>),
  saveWordMeaning: (v: {
    articleId: number;
    word: string;
    meaningJa: string;
    pos?: string | null;
    lemma?: string | null;
    exampleEn?: string | null;
    sentence?: string | null;
  }) =>
    fetch("/api/lookup", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    }).then(handle<{ ok: boolean }>),
  lookupHistory: (articleId: number) =>
    fetch(`/api/lookup?articleId=${articleId}`).then(handle<import("../types-word").LookupHistoryItem[]>),
  vocabList: () => fetch("/api/vocabulary").then(handle<import("../types-word").VocabItem[]>),
  vocabAdd: (v: { word: string; pos?: string; meaningJa: string; exampleEn?: string; sourceArticleId?: number }) =>
    fetch("/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    }).then(handle<import("../types-word").VocabItem>),
  vocabUpdate: (id: number, v: Partial<{ word: string; pos: string; meaningJa: string; exampleEn: string; mastered: boolean }>) =>
    fetch(`/api/vocabulary/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    }).then(handle<import("../types-word").VocabItem>),
  vocabDelete: (id: number) => fetch(`/api/vocabulary/${id}`, { method: "DELETE" }).then(handle<{ ok: boolean }>),
};
