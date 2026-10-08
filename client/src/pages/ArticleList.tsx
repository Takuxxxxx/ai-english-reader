import { useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useStore } from "../stores/useStore";

export default function ArticleList() {
  const { name } = useParams();
  const topic = decodeURIComponent(name ?? "");
  const { articles, loading, error, loadArticles, generateArticle, generating } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadArticles(topic);
  }, [topic, loadArticles]);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <Link to="/" className="text-sm text-slate-500 hover:underline">
        ← トピック一覧に戻る
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{topic}</h1>
        <button
          disabled={generating}
          onClick={async () => {
            const a = await generateArticle(topic);
            if (a) navigate(`/articles/${a.id}`);
          }}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
        >
          {generating ? "生成中…" : "新しい記事を生成"}
        </button>
      </div>
      {loading && <p className="mt-4">読み込み中…</p>}
      {error && <p className="mt-4 text-red-600">エラー: {error}</p>}
      <ul className="mt-4 space-y-3">
        {articles.map((a) => (
          <li key={a.id} className="rounded-xl border bg-white p-4 dark:bg-slate-800">
            <Link to={`/articles/${a.id}`} className="font-semibold hover:underline">
              {a.title}
            </Link>
            <p className="mt-1 text-xs text-slate-500">
              {a.wordCount}語 · {new Date(a.createdAt + "Z").toLocaleString("ja-JP")}
              {a.isNew && <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-amber-900">新着</span>}
              {a.isRead && <span className="ml-2 text-emerald-600">既読</span>}
            </p>
          </li>
        ))}
      </ul>
      {!loading && articles.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">まだ記事がありません。「新しい記事を生成」を押してください。</p>
      )}
    </div>
  );
}
