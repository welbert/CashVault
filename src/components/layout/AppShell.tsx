import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useActiveProfile } from "../../hooks/useActiveProfile";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/movimentacoes", label: "Movimentações", end: false },
  { to: "/contas", label: "Contas", end: false },
  { to: "/metas", label: "Metas & Compras", end: false },
  { to: "/tags", label: "Tags", end: false },
  { to: "/configuracoes", label: "Configurações", end: false },
];

export function AppShell() {
  const { profile } = useActiveProfile();
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  return (
    <div className="flex h-screen bg-theme-bg text-theme-1">
      <aside className="flex w-56 shrink-0 flex-col border-r border-theme-border bg-theme-surface px-4 py-6">
        <div className="mb-8 px-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-xs uppercase tracking-widest text-violet-300">CashVault</span>
            {version && <span className="font-mono text-[10px] text-theme-4">v{version}</span>}
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-theme-1">{profile?.name}</div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-violet-500/15 text-violet-300" : "text-theme-3 hover:bg-theme-hover hover:text-theme-1"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
