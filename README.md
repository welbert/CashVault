# CashVault

A personal finance desktop app for Windows, macOS, and Linux. Tracks income and expenses, installment purchases, long-term savings goals, recurring bills, and tags — all stored locally in SQLite, no cloud, no sync, no telemetry.

## Features

- **Multi-profile** — separate, fully isolated data per profile; the last active profile is remembered between launches
- **Dashboard** — monthly profit, month-over-month variation, cash flow chart, cumulative cash balance, and your primary savings goal at a glance
- **Installment purchases** — splitting a purchase into installments generates real monthly transactions (not just a decorative label), so cash flow reflects the actual month-by-month impact
- **Goals & future purchases** — track progress toward a target (an apartment, a trip, a gadget) against your accumulated balance — no arbitrary yearly reset
- **Tags** — tag any transaction with one or more labels (comes with 8 sensible defaults) and filter Movimentações by them; renaming/deleting a tag warns you how many transactions use it first
- **Recurring bills** — register monthly or yearly bills with an estimated value; mark them paid (with the real amount, since bills like electricity vary) and the Dashboard alerts you about what's still pending, plus a forecasted-expenses total
- **CSV export** — export the transactions currently filtered in Movimentações
- **Dark / light / system theme**
- **Local logging** — errors are written to a daily log file, one click away from Settings, for troubleshooting

## Stack

| Layer      | Technology                          |
|------------|--------------------------------------|
| UI         | React 19 + TypeScript + Tailwind v4  |
| Routing    | react-router-dom v6                  |
| Desktop    | Tauri v2                             |
| Backend    | Rust                                 |
| Database   | SQLite (`rusqlite` bundled)          |
| Charts     | Chart.js + react-chartjs-2           |

## Building from source

**Prerequisites:** [Rust](https://rustup.rs), [Node.js](https://nodejs.org), [pnpm](https://pnpm.io)

```bash
git clone https://github.com/welbert/CashVault
cd CashVault
pnpm install
pnpm tauri build
```

The Windows installer (NSIS) is generated in `src-tauri/target/release/bundle/nsis/`.

For development with hot-reload:

```bash
pnpm tauri dev
```

## Data & privacy

Everything is stored in a local SQLite file — nothing leaves your machine.

| OS      | Data directory                                                     |
|---------|----------------------------------------------------------------------|
| Windows | `%APPDATA%\com.welbert.cashvault\`                                   |
| macOS   | `~/Library/Application Support/com.welbert.cashvault/`               |
| Linux   | `~/.local/share/com.welbert.cashvault/`                              |

## Documentation

Architecture, database schema, Tauri commands, and frontend structure are documented in [`docs/`](docs/) — see [`CLAUDE.md`](CLAUDE.md) for the index.
