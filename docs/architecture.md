# Architecture

## Overview

Two independent layers that communicate via Tauri IPC (`invoke`):

```
┌──────────────────────────────────────────────┐
│  Frontend  (React + TypeScript + Tailwind)   │
│                                               │
│  App → ProfileGate → AppShell → pages        │
│        (Dashboard, Movimentações, Contas,    │
│         Metas & Compras, Tags, Configurações)│
└───────────────────┬───────────────────────────┘
                    │  invoke() (src/lib/api.ts)
┌───────────────────▼───────────────────────────┐
│  Backend  (Rust + Tauri v2)                  │
│                                               │
│  Commands → SQLite (rusqlite)                │
└───────────────────────────────────────────────┘
```

| Layer      | Technology                          |
|------------|--------------------------------------|
| UI         | React 19 + TypeScript + Tailwind v4  |
| Routing    | react-router-dom v6                  |
| Charts     | Chart.js + react-chartjs-2           |
| Desktop    | Tauri v2                             |
| Backend    | Rust (Tauri commands)                |
| Database   | SQLite via `rusqlite` (bundled)      |
| Build      | Vite v7                              |

## Data flow — app startup

```
main.tsx (applies theme, disables right-click)
       │
       ▼
App.tsx → <ProfileGate>
       │
       ├─ invoke("get_active_profile")
       │     │
       │     ├─ active profile exists → renders <AppShell><Outlet/></AppShell>
       │     │
       │     └─ none active → invoke("list_users")
       │           ├─ empty list  → redirects to /perfil/novo
       │           └─ non-empty list → shows inline profile selector
       │
       ▼
Dashboard (route "/") → invoke("get_dashboard", {userId, year, month})
                     → invoke("list_bills", ...) for the pending bill alert
                     → invoke("list_targets", {kind:"goal"}) for the main goal
```

All the "which profile is active" state lives in `ProfileContext` (frontend) and is mirrored on the backend by `AppState.active_user_id` (in memory) + `config.last_active_user_id` (persisted — used to remember the profile across app restarts).

## Process lifecycle

- **No tray, no hide-on-close** — unlike `Personal.TOTP`: closing the window (X) ends the process normally. There is no tray icon nor global shortcut.
- **No authentication yet** — `users.password_hash`/`password_salt` exist in the schema but aren't used; any profile opens without a password. See `docs/database.md`.
- A single SQLite connection (`AppState.db: Mutex<Connection>`) shared by all commands.

## Data directory

| OS      | Path                                                              |
|---------|------------------------------------------------------------------------|
| Windows | `%APPDATA%\com.welbert.cashvault\gerenciador.db`                       |
| macOS   | `~/Library/Application Support/com.welbert.cashvault/gerenciador.db`   |
| Linux   | `~/.local/share/com.welbert.cashvault/gerenciador.db`                  |

Logs live in `.../logs/log-YYYYMMDD.txt` in the same base directory (see `write_log`/`open_log_dir` in `docs/commands.md`).
