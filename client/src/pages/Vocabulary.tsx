import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { speak } from "../utils/text";
import type { VocabItem } from "../types-word";

type Filter = "all" | "active" | "mastered";
type Sort = "newest" | "alpha";

interface DragRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export default function Vocabulary() {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [editing, setEditing] = useState<VocabItem | null>(null);
  const [form, setForm] = useState({ word: "", pos: "", meaningJa: "", exampleEn: "" });
  const [autoLoading, setAutoLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [drag, setDrag] = useState<DragRect | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  // Temporary diagnostics: snapshot size at drag start.
  const [snapSize, setSnapSize] = useState(-1);
  const itemRefs = useRef(new Map<number, HTMLLIElement>());
  const listRef = useRef<HTMLUListElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  // Selection at drag-gesture start; hits during the gesture are added to it
  // so scrolled-out items are not lost.
  const gestureBase = useRef<Set<number>>(new Set());

  const reload = async () => {
    setLoading(true);
    try {
      setItems(await api.vocabList());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = items.filter((v) => {
      if (filter === "mastered" && !v.mastered) return false;
      if (filter === "active" && v.mastered) return false;
      if (query && !`${v.word} ${v.meaningJa ?? ""}`.toLowerCase().includes(query)) return false;
      return true;
    });
    list = [...list].sort((a, b) =>
      sort === "alpha" ? a.word.localeCompare(b.word) : b.id - a.id
    );
    return list;
  }, [items, q, filter, sort]);

  const applyRect = (x0: number, y0: number, x1: number, y1: number) => {
    const rx0 = Math.min(x0, x1);
    const rx1 = Math.max(x0, x1);
    const ry0 = Math.min(y0, y1);
    const ry1 = Math.max(y0, y1);
    setDrag({ x0: rx0, y0: ry0, x1: rx1, y1: ry1 });
    const hit = new Set<number>();
    for (const [id, el] of itemRefs.current) {
      const r = el.getBoundingClientRect();
      if (r.left < rx1 && r.right > rx0 && r.top < ry1 && r.bottom > ry0) hit.add(id);
    }
    // Union with the gesture-start selection (never drops scrolled-out items).
    const base = gestureBase.current;
    if (base.size === 0) setSelected(hit);
    else setSelected(new Set([...base, ...hit]));
  };

  const onListMouseDown = (e: MouseEvent) => {
    if (!selectMode) return;
    if (e.button !== 0) return;
    // Ignore scrollbar drags.
    if (e.clientX > document.documentElement.clientWidth || e.clientY > document.documentElement.clientHeight) return;
    const inList = !!listRef.current?.contains(e.target as Node);
    const li = (e.target as HTMLElement).closest("li");
    const clickedId = li?.getAttribute("data-id");
    if ((e.target as HTMLElement).closest("button,input,select,a,textarea")) return;
    e.preventDefault();
    // Suppress native text selection synchronously (no render delay).
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    const onSelectStart = (ev: Event) => ev.preventDefault();
    document.addEventListener("selectstart", onSelectStart);
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    let lastX = sx;
    let lastY = sy;
    let prevY = sy;
    let raf = 0;
    dragStart.current = { x: sx, y: sy };
    gestureBase.current = new Set(selected);
    setSnapSize(selected.size);
    const cleanup = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("selectstart", onSelectStart);
      document.body.style.userSelect = prevUserSelect;
    };
    // Keep scrolling while the pointer rests near the viewport edge,
    // but only in the direction the pointer is heading (so an upward drag
    // starting near the bottom edge never yanks the viewport away).
    const autoScroll = () => {
      const MARGIN = 70;
      const SPEED = 14;
      const goingDown = lastY >= prevY;
      const goingUp = lastY <= prevY;
      prevY = lastY;
      if (lastY > window.innerHeight - MARGIN && goingDown) window.scrollBy(0, SPEED);
      else if (lastY < MARGIN && goingUp) window.scrollBy(0, -SPEED);
      else {
        raf = requestAnimationFrame(autoScroll);
        return;
      }
      applyRect(sx, sy, lastX, lastY);
      raf = requestAnimationFrame(autoScroll);
    };
    const onMove = (ev: MouseEvent) => {
      lastX = ev.clientX;
      lastY = ev.clientY;
      if (!moved) {
        if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 6) return;
        moved = true;
        raf = requestAnimationFrame(autoScroll);
      }
      applyRect(sx, sy, ev.clientX, ev.clientY);
    };
    const onUp = (ev: MouseEvent) => {
      const wasDrag = moved;
      dragStart.current = null;
      if (wasDrag) {
        applyRect(sx, sy, ev.clientX, ev.clientY);
      } else if (inList && clickedId) {
        // Simple click in select mode: toggle that item.
        // (Background clicks no longer clear; use checkboxes or 選択解除.)
        const id = Number(clickedId);
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }
      setDrag(null);
      cleanup();
    };
    // If the window loses focus mid-drag (e.g. mouse released outside),
    // stop everything but keep the selection built so far.
    const onBlur = () => {
      dragStart.current = null;
      setDrag(null);
      cleanup();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("blur", onBlur);
  };

  // Page-wide mousedown so drags can start from any blank area.
  useEffect(() => {
    if (!selectMode) return;
    window.addEventListener("mousedown", onListMouseDown);
    return () => window.removeEventListener("mousedown", onListMouseDown);
  });

  // Safety: never leave the page unselectable if unmounted mid-drag.
  useEffect(() => {
    return () => {
      document.body.style.userSelect = "";
    };
  }, []);

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size}件削除しますか？`)) return;
    setBusy(true);
    try {
      await Promise.all([...selected].map((id) => api.vocabDelete(id)));
      setSelected(new Set());
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const bulkMastered = async (m: boolean) => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await Promise.all([...selected].map((id) => api.vocabUpdate(id, { mastered: m })));
      setSelected(new Set());
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const addNew = async () => {
    if (!form.word.trim() || !form.meaningJa.trim()) return;
    await api.vocabAdd({
      word: form.word.trim(),
      pos: form.pos.trim() || undefined,
      meaningJa: form.meaningJa.trim(),
      exampleEn: form.exampleEn.trim() || undefined,
    });
    setForm({ word: "", pos: "", meaningJa: "", exampleEn: "" });
    await reload();
  };

  const autoFill = async () => {
    if (!form.word.trim()) return;
    setAutoLoading(true);
    try {
      const r = await api.lookup(form.word.trim(), "");
      setForm((f) => ({
        ...f,
        pos: r.pos ?? f.pos,
        meaningJa: r.meaningJa ?? f.meaningJa,
        exampleEn: r.exampleEn ?? f.exampleEn,
      }));
    } finally {
      setAutoLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    await api.vocabUpdate(editing.id, {
      word: editing.word,
      pos: editing.pos ?? "",
      meaningJa: editing.meaningJa ?? "",
      exampleEn: editing.exampleEn ?? "",
    });
    setEditing(null);
    await reload();
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold">単語帳</h1>

      <div className="mt-4 rounded-xl border p-4">
        <p className="text-sm font-semibold">手動で追加</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={form.word}
            onChange={(e) => setForm({ ...form, word: e.target.value })}
            placeholder="単語 (例: convenient)"
            className="rounded-lg border p-2 dark:bg-slate-800"
          />
          <input
            value={form.pos}
            onChange={(e) => setForm({ ...form, pos: e.target.value })}
            placeholder="品詞 (例: 形容詞)"
            className="rounded-lg border p-2 dark:bg-slate-800"
          />
          <input
            value={form.meaningJa}
            onChange={(e) => setForm({ ...form, meaningJa: e.target.value })}
            placeholder="意味 (例: 便利な)"
            className="rounded-lg border p-2 dark:bg-slate-800"
          />
          <input
            value={form.exampleEn}
            onChange={(e) => setForm({ ...form, exampleEn: e.target.value })}
            placeholder="例文 (任意)"
            className="rounded-lg border p-2 dark:bg-slate-800"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={autoFill}
            disabled={autoLoading || !form.word.trim()}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {autoLoading ? "取得中…" : "意味を自動取得"}
          </button>
          <button
            onClick={addNew}
            disabled={!form.word.trim() || !form.meaningJa.trim()}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            保存
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="検索（単語・意味）"
          className="min-w-0 flex-1 rounded-lg border p-2 dark:bg-slate-800"
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="rounded-lg border p-2 dark:bg-slate-800">
          <option value="all">すべて</option>
          <option value="active">未習得のみ</option>
          <option value="mastered">覚えたのみ</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border p-2 dark:bg-slate-800">
          <option value="newest">新しい順</option>
          <option value="alpha">A-Z順</option>
        </select>
        <button
          onClick={() => {
            setSelectMode((v) => !v);
            setSelected(new Set());
          }}
          className={`rounded-lg border px-3 py-2 ${selectMode ? "bg-blue-600 text-white" : ""}`}
        >
          {selectMode ? "✓ 選択中" : "□ 複数選択"}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-xl border bg-white/95 p-2 text-sm shadow dark:bg-slate-800/95">
          <span className="font-semibold">{selected.size}件選択中</span>
          <button onClick={bulkDelete} disabled={busy} className="rounded-lg bg-red-600 px-3 py-1.5 text-white disabled:opacity-50">
            一括削除
          </button>
          <button onClick={() => bulkMastered(true)} disabled={busy} className="rounded-lg border px-3 py-1.5 disabled:opacity-50">
            覚えたにする
          </button>
          <button onClick={() => bulkMastered(false)} disabled={busy} className="rounded-lg border px-3 py-1.5 disabled:opacity-50">
            まだに戻す
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto rounded-lg px-2 py-1.5 text-slate-500">
            選択解除
          </button>
          <span className="text-[10px] text-slate-400">sel-v4 snap:{snapSize}</span>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        {selectMode
          ? "選択モード：カードのクリック・チェックで選択/解除、ドラッグで囲んで追加（スクロールしても保持。解除は「選択解除」ボタン）"
          : "「□ 複数選択」を押すと、クリックやドラッグでまとめて選べます"}
      </p>

      {loading && <p className="mt-4">読み込み中…</p>}
      <ul ref={listRef} className={`mt-2 space-y-3 ${selectMode ? "cursor-default select-none" : ""}`}>
        {shown.map((v) => {
          const isSel = selected.has(v.id);
          return (
          <li
            key={v.id}
            data-id={v.id}
            ref={(el) => {
              if (el) itemRefs.current.set(v.id, el);
              else itemRefs.current.delete(v.id);
            }}
            className={`rounded-xl border p-4 ${isSel ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : v.mastered ? "opacity-60" : "bg-white dark:bg-slate-800"}`}
          >
            {editing?.id === v.id ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input value={editing.word} onChange={(e) => setEditing({ ...editing, word: e.target.value })} className="rounded-lg border p-2 dark:bg-slate-700" />
                <input value={editing.pos ?? ""} onChange={(e) => setEditing({ ...editing, pos: e.target.value })} className="rounded-lg border p-2 dark:bg-slate-700" />
                <input value={editing.meaningJa ?? ""} onChange={(e) => setEditing({ ...editing, meaningJa: e.target.value })} className="rounded-lg border p-2 dark:bg-slate-700" />
                <input value={editing.exampleEn ?? ""} onChange={(e) => setEditing({ ...editing, exampleEn: e.target.value })} className="rounded-lg border p-2 dark:bg-slate-700" />
                <div className="flex gap-2 sm:col-span-2">
                  <button onClick={saveEdit} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-slate-900">保存</button>
                  <button onClick={() => setEditing(null)} className="rounded-lg border px-3 py-1.5 text-sm">キャンセル</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggleOne(v.id)}
                    className="h-4 w-4"
                    aria-label={`${v.word}を選択`}
                  />
                  <span className="text-lg font-bold">{v.word}</span>
                  <button onClick={() => speak(v.word)} className="text-sm" aria-label="発音">🔊</button>
                  {v.pos && <span className="text-xs text-slate-500">{v.pos}</span>}
                  {v.mastered && <span className="rounded bg-emerald-100 px-1.5 text-xs text-emerald-800">覚えた</span>}
                </div>
                <p className="mt-1">{v.meaningJa}</p>
                {v.exampleEn && <p className="mt-0.5 text-sm italic text-slate-500">{v.exampleEn}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {v.sourceArticleId && (
                    <Link to={`/articles/${v.sourceArticleId}`} className="text-slate-500 hover:underline">
                      出典: {v.sourceArticleTitle ?? `記事#${v.sourceArticleId}`}
                    </Link>
                  )}
                  <span className="ml-auto flex gap-2">
                    <button
                      onClick={async () => { await api.vocabUpdate(v.id, { mastered: !v.mastered }); await reload(); }}
                      className="rounded border px-2 py-0.5"
                    >
                      {v.mastered ? "まだ" : "覚えた"}
                    </button>
                    <button onClick={() => setEditing(v)} className="rounded border px-2 py-0.5">編集</button>
                    <button
                      onClick={async () => { if (confirm(`「${v.word}」を削除しますか？`)) { await api.vocabDelete(v.id); await reload(); } }}
                      className="rounded border px-2 py-0.5 text-red-600"
                    >
                      削除
                    </button>
                  </span>
                </div>
              </>
            )}
          </li>
          );
        })}
      </ul>
      {drag && (
        <div
          className="pointer-events-none fixed z-50 rounded border-2 border-blue-500 bg-blue-200/30"
          style={{
            left: drag.x0,
            top: drag.y0,
            width: Math.max(drag.x1 - drag.x0, 1),
            height: Math.max(drag.y1 - drag.y0, 1),
          }}
        />
      )}
      {!loading && shown.length === 0 && <p className="mt-6 text-sm text-slate-500">単語がありません。記事中の単語をタップして保存してください。</p>}
    </div>
  );
}
