import { Link, Outlet, useLocation } from "react-router-dom";

export default function App() {
  const loc = useLocation();
  const nav = [
    { to: "/", label: "ホーム" },
    { to: "/vocabulary", label: "単語帳" },
    { to: "/settings", label: "設定" },
  ];
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white dark:bg-slate-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <Link to="/" className="font-bold">
            AI英語記事リーダー
          </Link>
          <nav className="flex gap-4 text-sm">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={loc.pathname === n.to ? "font-semibold underline" : "text-slate-500"}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
