import { create } from "zustand";
import type { Topic, Article, SettingsState } from "../types";
import { api } from "../services/api";

interface AppState {
  topics: Topic[];
  articles: Article[];
  currentArticle: Article | null;
  settings: SettingsState | null;
  llmProvider: string;
  loading: boolean;
  generating: boolean;
  error: string | null;
  loadTopics: () => Promise<void>;
  loadArticles: (topic?: string) => Promise<void>;
  loadArticle: (id: number) => Promise<void>;
  generateArticle: (topic: string) => Promise<Article | null>;
  markRead: (id: number, isRead: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (values: Record<string, string>) => Promise<void>;
  setError: (e: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  topics: [],
  articles: [],
  currentArticle: null,
  settings: null,
  llmProvider: "mock",
  loading: false,
  generating: false,
  error: null,

  loadTopics: async () => {
    set({ loading: true, error: null });
    try {
      const topics = await api.topics();
      set({ topics });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "トピックの取得に失敗しました" });
    } finally {
      set({ loading: false });
    }
  },

  loadArticles: async (topic) => {
    set({ loading: true, error: null });
    try {
      const articles = await api.articles(topic);
      set({ articles });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "記事の取得に失敗しました" });
    } finally {
      set({ loading: false });
    }
  },

  loadArticle: async (id) => {
    set({ loading: true, error: null });
    try {
      const currentArticle = await api.article(id);
      set({ currentArticle });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "記事の取得に失敗しました" });
    } finally {
      set({ loading: false });
    }
  },

  generateArticle: async (topic) => {
    set({ generating: true, error: null });
    try {
      const article = await api.generate(topic);
      set((s) => ({ articles: [article, ...s.articles] }));
      return article;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "生成に失敗しました" });
      return null;
    } finally {
      set({ generating: false });
    }
  },

  markRead: async (id, isRead) => {
    await api.markRead(id, isRead);
    set((s) => ({
      articles: s.articles.map((a) => (a.id === id ? { ...a, isRead } : a)),
      currentArticle: s.currentArticle?.id === id ? { ...s.currentArticle, isRead } : s.currentArticle,
    }));
  },

  loadSettings: async () => {
    try {
      const { settings, llm } = await api.getSettings();
      set({ settings: settings as SettingsState, llmProvider: llm.provider });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "設定の取得に失敗しました" });
    }
  },

  saveSettings: async (values) => {
    await api.saveSettings(values);
    set((s) => ({ settings: { ...(s.settings ?? {}), ...values } as SettingsState }));
  },

  setError: (error) => set({ error }),
}));
