import { useEffect, useState } from "react";
import { useStore } from "../stores/useStore";

export default function Settings() {
  const { settings, llmProvider, loadSettings, saveSettings } = useStore();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!settings) return <p className="p-6">読み込み中…</p>;

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold">設定</h1>
      <p className="mt-2 text-sm text-slate-500">
        LLMプロバイダ: <strong>{llmProvider}</strong>（無料の内蔵モックがデフォルト。APIキー不要）
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">記事の長さ</span>
          <select
            value={form.articleLength ?? "300"}
            onChange={(e) => update("articleLength", e.target.value)}
            className="mt-1 block w-full rounded-lg border p-2 dark:bg-slate-800"
          >
            <option value="200">200語</option>
            <option value="300">300語</option>
            <option value="400">400語</option>
            <option value="500">500語</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">難易度</span>
          <select
            value={form.difficulty ?? "just-right"}
            onChange={(e) => update("difficulty", e.target.value)}
            className="mt-1 block w-full rounded-lg border p-2 dark:bg-slate-800"
          >
            <option value="easier">やさしめ</option>
            <option value="just-right">ちょうどよい</option>
            <option value="challenging">ややチャレンジ</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">テーマ</span>
          <select
            value={form.theme ?? "light"}
            onChange={(e) => {
              update("theme", e.target.value);
              document.documentElement.classList.toggle("dark", e.target.value === "dark");
            }}
            className="mt-1 block w-full rounded-lg border p-2 dark:bg-slate-800"
          >
            <option value="light">ライト</option>
            <option value="dark">ダーク</option>
          </select>
        </label>

        <button
          onClick={async () => {
            await saveSettings(form);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-slate-900"
        >
          保存する
        </button>
        {saved && <p className="text-sm text-emerald-600">保存しました</p>}
      </div>

      <div className="mt-8 rounded-lg bg-slate-100 p-4 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <p className="font-semibold">無料LLMの使い方（任意）</p>
        <ul className="mt-1 list-disc pl-5">
          <li>そのまま: 内蔵モック生成（キー不要・完全無料）</li>
          <li>Ollamaを使う: `ollama serve` → server/.env で LLM_PROVIDER=ollama</li>
          <li>OpenAI互換を使う: server/.env で LLM_PROVIDER=openai-compat と BASE_URL等を設定</li>
        </ul>
      </div>
    </div>
  );
}
