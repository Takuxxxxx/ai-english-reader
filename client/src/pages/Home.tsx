import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../stores/useStore";

export default function Home() {
  const { topics, loading, error, loadTopics, generateArticle, generating } = useStore();

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  if (loading) return <p className="p-6">読み込み中…</p>;
  if (error) return <p className="p-6 text-red-600">エラー: {error}</p>;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <h1 className="mb-4 text-2xl font-bold">トピックを選ぶ</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {topics
          .filter((t) => t.enabled)
          .map((t) => (
            <div key={t.id} className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/topics/${encodeURIComponent(t.name)}`} className="text-lg font-semibold hover:underline">
                  {t.name}
                </Link>
                {t.unreadCount > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
                    未読 {t.unreadCount}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-slate-500">
                {t.latestTitle ? `最新: ${t.latestTitle}` : "まだ記事がありません"}
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  to={`/topics/${encodeURIComponent(t.name)}`}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-slate-900"
                >
                  記事一覧
                </Link>
                <button
                  disabled={generating}
                  onClick={async () => {
                    const a = await generateArticle(t.name);
                    if (a) window.location.href = `/articles/${a.id}`;
                  }}
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  {generating ? "生成中…" : "新しい記事を生成"}
                </button>
              </div>
            </div>
          ))}
      </div>
      {generating && <p className="mt-4 text-sm text-slate-500">記事を生成しています。少しお待ちください…</p>}
    </div>
  );
}
