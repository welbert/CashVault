# CashVault — CLAUDE.md

Desktop personal finance app (multi-profile). Tracks income/expenses, installment purchases (turned into N real monthly entries), long-term goals and future purchases (progress vs accumulated balance, no annual reset), tags, recurring bills (monthly/annual), and CSV export. Modeled on the same architecture as the sibling project `Personal.TOTP`, but without tray/hotkey/password — it's a regular window.

## Versioning rule

**When bumping the version, update all 3 files in sync** — they always need to match:

| File | Field |
|------|-------|
| `package.json` | `"version"` (line 5) |
| `src-tauri/Cargo.toml` | `version` (line 3) |
| `src-tauri/tauri.conf.json` | `"version"` (line 4) |

See [docs/versioning.md](docs/versioning.md) for semver rules.

## Money field rule

**Every R$ value input uses the `MoneyInput` component** (`src/components/MoneyInput.tsx`) — never a raw `<input type="number">`. It already implements the "digit enters from the right" mask (1 → R$0.01) used throughout the app. See `docs/frontend.md`.

## Theme rule (tokens)

Never hardcode a Tailwind background/text/border color (`bg-slate-*`, `text-gray-*`...) — always use the `bg-theme-*` / `text-theme-*` / `border-theme-border` tokens defined in `src/index.css`. Accent colors (`violet`, `rose`, `emerald`, `amber`) are intentional and stay as they are. See `docs/frontend.md`.

## Release Notes

After every bug fix or new feature, append an entry to `RELEASE.md` under the current version section, grouped under a `## Features` / `## Fixes` subheading (only add the subheadings that section actually has entries for — e.g. a fix-only version gets just `## Fixes`):
- `**Fix:**` for bug fixes, under `## Fixes`
- `**Feature:**` for new functionality, under `## Features`

If the version section does not exist yet, create it at the top of the file as `# CashVault — Unreleased`. It gets renamed to the actual version number (`vX.Y.Z`) only in the release commit that bumps the version.

## Schema rule (init_db + migrate_db)

Every new table/column goes in **two places** in `src-tauri/src/db.rs`: the full `CREATE TABLE` inside `init_db` (fresh install) and an equivalent idempotent `ALTER TABLE` inside `migrate_db` (for whoever already had the database). A `CREATE INDEX` that references the new column can only live in `migrate_db`, never appended to `init_db`'s `CREATE TABLE IF NOT EXISTS` — if the table already existed before the column, that `CREATE TABLE IF NOT EXISTS` becomes a no-op and the column doesn't exist yet at that point (this already broke the app once, see `docs/database.md`).

## Stack

| Layer      | Technology                            |
|------------|--------------------------------------|
| UI         | React 19 + TypeScript + Tailwind v4  |
| Routing    | react-router-dom v6                  |
| Desktop    | Tauri v2                             |
| Backend    | Rust (Tauri commands)                |
| Database   | SQLite via `rusqlite` (bundled)      |
| Charts     | Chart.js + react-chartjs-2           |
| Build      | Vite v7                              |

**Package manager: pnpm** (do not use npm/yarn).

## Commands

```bash
pnpm tauri dev        # dev with hot-reload (Rust + frontend)
pnpm tauri build      # production build (installer in src-tauri/target/release/bundle)
pnpm build            # frontend only (tsc + vite build)
cargo check           # inside src-tauri/ — quick type-check of the backend without generating a binary
```

If `pnpm install`/`pnpm build` complains about an ignored build script (esbuild): `pnpm approve-builds --all`.

## Structure

```
CashVault/
├── src/
│   ├── App.tsx                  # routes (see docs/frontend.md)
│   ├── main.tsx                 # applies theme + disables right-click before render
│   ├── theme.ts / logger.ts     # theme and logging helpers (same pattern as Personal.TOTP)
│   ├── pages/                   # one per route
│   ├── components/              # see docs/frontend.md
│   ├── context/                 # ProfileContext, ToastContext
│   ├── hooks/                   # useActiveProfile, useDashboard
│   └── lib/
│       ├── api.ts               # only place that calls invoke() — types mirror the Rust structs
│       └── format.ts            # fmt() currency, fmtDate(), fmtPct()
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs               # AppState, setup, command registration
│   │   ├── db.rs                # schema (init_db + migrate_db), aggregations (balance, totals)
│   │   ├── models.rs            # serialized structs (camelCase) returned to the frontend
│   │   └── commands/            # one file per domain (users, transactions, targets, tags, bills, reports, export, logging)
│   ├── Cargo.toml
│   ├── tauri.conf.json          # identifier com.welbert.cashvault, 1280x860 window
│   └── capabilities/default.json
└── docs/                        # technical documentation (below)
```

## Technical documentation

| File | Content |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Layers, data flow on app startup, process lifecycle, data directory |
| [docs/database.md](docs/database.md) | Full SQLite schema, migration pattern, what each table does |
| [docs/commands.md](docs/commands.md) | All Tauri commands, by domain, with signature |
| [docs/frontend.md](docs/frontend.md) | Routes, pages, reusable components, hooks/context, conventions (theme, i18n) |
| [docs/versioning.md](docs/versioning.md) | Semver rules, files to update |

## Key behaviors

- **Closing the window** → terminates the process (no tray, unlike `Personal.TOTP`)
- **Right-click** → context menu disabled globally
- **Multi-profile** → active profile is remembered across restarts (`config.last_active_user_id`); switching profiles lives in Settings
- **Installments** → generated as N real monthly entries at creation time (not a single record); editing/deleting can target one installment or the whole group
- **Goals/future purchases** → progress is always vs the profile's total accumulated balance, never resets per year
- **Tags** → many-to-many with transactions; filter matches any of the selected tags (OR)
- **Bills** → there's no standalone "paid" field — status is always derived from whether a transaction linked to that period exists; deleting a bill never deletes already-recorded transactions
- **CSV export** → always respects the filter (year/month) selected on the Transactions screen
- **Logger** → use `logger.*` (`src/logger.ts`) instead of `console.*` directly; writes to a file, accessible via Settings → Diagnostics → Open logs folder

## Adding features

### New Rust command
1. Write `#[tauri::command] pub fn name(...)` in `src-tauri/src/commands/<domain>.rs` (create a new file if it's a new domain, register it in `commands/mod.rs`)
2. Register in `.invoke_handler(tauri::generate_handler![..., commands::<domain>::name])` in `lib.rs`
3. Add the corresponding typed wrapper in `src/lib/api.ts`

### New table/column
See "Schema rule" above and `docs/database.md`.

### New dependency
```bash
cd src-tauri && cargo add <crate>   # Rust
pnpm add <package>                  # frontend (or pnpm add -D for dev)
```

## Environment notes

- Windows: use `python` (not `python3`) in the terminal
- Tauri identifier: `com.welbert.cashvault` — different from `Personal.TOTP`, each app has its own data folder
- App icon: generated from a source image with `pnpm tauri icon <file.png>` (regenerates all of `src-tauri/icons/`)
