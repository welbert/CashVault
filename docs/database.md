# Database

SQLite via `rusqlite` (`bundled` feature — does not depend on SQLite being installed on the system).
Single file: `gerenciador.db` in the app's data directory (see `docs/architecture.md`).

`PRAGMA foreign_keys = ON;` is set on every connection opened (`db::open_connection`) — without it the `ON DELETE CASCADE`/`SET NULL` below would do nothing.

## Schema/migration pattern (`src-tauri/src/db.rs`)

Two functions, called in this order in `open_connection`:

1. **`init_db`** — `CREATE TABLE IF NOT EXISTS` with the **complete, current** schema of each table. This is what runs on a brand-new installation from scratch.
2. **`migrate_db`** — idempotent `ALTER TABLE ... ADD COLUMN` (the "column already exists" error is ignored via `let _ = ...`) for databases that already existed **before** a new column/table was added.

**Rule when adding a new column/table:** it needs to go in both places — the `CREATE TABLE` inside `init_db` (for fresh installs) **and** as an `ALTER TABLE` in `migrate_db` (for those who already had the database). Any `CREATE INDEX` that depends on that new column can only run **after** it's guaranteed to exist — i.e., inside `migrate_db`, never inside the same `execute_batch` block of `init_db` right after the `CREATE TABLE IF NOT EXISTS` of the table that received it (this already caused a real bug: see the commit/history of `idx_transactions_bill` — the index was placed in `init_db` and broke on any database predating the Bills feature, because there the table already existed without the column and the `CREATE TABLE IF NOT EXISTS` became a no-op).

**Partial unique index** (used by `idx_targets_primary`, one row flagged `is_primary` per `(user_id, kind)`): `CREATE UNIQUE INDEX ... ON table(cols) WHERE flag_column = 1`. Same placement rule as above — lives in `migrate_db` only, since it depends on a column that may not exist yet on an existing database at `init_db` time.

**Dropping a `CHECK` constraint** (used once, for `dashboard_layout.size` — see below): SQLite has no `ALTER TABLE ... DROP CONSTRAINT`. `migrate_db` detects a stale `CHECK` by reading `sqlite_master.sql` for the table (`sql.contains("CHECK")`) and, only if found, rebuilds the table without it (`CREATE TABLE ..._new` with the fixed schema → `INSERT INTO ..._new SELECT ...` → `DROP TABLE` old → `RENAME TO`). Gated on the detection so it only runs once per database, ever. Prefer this over baking a `CHECK` around a vocabulary that's still expected to change (see `migrate_dashboard_layout_drop_size_check` in `db.rs`).

## Tables

### `users` — profiles
| Column          | Type | Notes |
|-----------------|------|-------|
| `id`            | INTEGER PK | |
| `name`          | TEXT NOT NULL | |
| `password_hash` | TEXT NULL | reserved — no password implemented yet |
| `password_salt` | BLOB NULL | reserved |
| `base_balance`  | REAL NOT NULL DEFAULT 0 | starting balance before the first entry |
| `created_at`    | TEXT | |

Deleting a user does `ON DELETE CASCADE` on `transactions`, `targets`, `tags`, `bills`.

### `transactions` — entries (income/expenses)
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `user_id` | INTEGER → `users(id)` CASCADE | |
| `type` | TEXT CHECK IN ('in','out') | |
| `name` | TEXT NOT NULL | |
| `date` | TEXT (`YYYY-MM-DD`) | |
| `amount` | REAL | installment value when part of a group; full value otherwise |
| `installment_group_id` | INTEGER NULL → self-reference `transactions(id)` | id of the group's 1st installment (points to itself) |
| `installment_index` / `installment_count` | INTEGER NULL | 1-based / group total |
| `bill_id` | INTEGER NULL → `bills(id)` **SET NULL** | which bill this payment came from |
| `bill_year` / `bill_month` | INTEGER NULL | period this payment settles (month is only used for monthly bills) |
| `created_at` / `updated_at` | TEXT | |

CHECK: the three installment fields are either all NULL or all filled in together.

Installment purchases generate **N real rows**, one per month (not a single record with informational metadata) — `create_installment_purchase` inserts everything in a single SQL transaction, with the last installment absorbing the rounding remainder so the sum matches exactly.

`bill_id` uses `ON DELETE SET NULL` on purpose: **deleting a bill never deletes the transactions already recorded**, they just lose the reference to the originating bill.

Indexes: `(user_id, date)`, `(installment_group_id)`, `(bill_id, bill_year, bill_month)`.

### `targets` — goals and future purchases
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `user_id` | → `users(id)` CASCADE | |
| `kind` | TEXT CHECK IN ('goal','purchase') | |
| `name` | TEXT | |
| `target_value` | REAL | |
| `is_primary` | INTEGER NOT NULL DEFAULT 0 | which one the Dashboard's "Meta/Compra principal" card shows |

Goals (`goal`) and future purchases (`purchase`) live in the **same table** with a discriminator — mechanically they're identical (name + target value + progress vs. the profile's total accumulated balance, with no reset per year/month). `list_targets` already returns `pct`/`remaining` computed from the current balance (`db::current_saldo`).

At most one `is_primary = 1` row per `(user_id, kind)`, enforced by the partial unique index `idx_targets_primary`. `set_primary_target` clears the flag for every other target of the same profile+kind before setting it on the chosen one (single transaction). Set from the ★ button in `TargetList` (Metas & Compras); the Dashboard falls back to the first-created target of that kind (`ORDER BY id`) when none is flagged — same as the original (pre-flag) behavior.

### `tags` + `transaction_tags` — tags (many-to-many)
```
tags(id, user_id → users CASCADE, name, created_at)         -- unique (user_id, name)
transaction_tags(transaction_id → transactions CASCADE,
                  tag_id → tags CASCADE,
                  PRIMARY KEY (transaction_id, tag_id))
```
Every tag disappears along with the profile or the transaction (cascade on both sides). `list_tags` returns `usage_count` (join with `transaction_tags`) used to warn before deleting a tag in use. Tag filtering in `list_transactions` matches **any** of the selected tags (OR), not all of them.

New profiles are born with 8 default tags (`db::DEFAULT_TAGS`, seeded in `create_user`): Lazer, Viagem, Alimentação, Transporte, Saúde, Moradia, Assinaturas, Educação.

### `bills` — recurring bills
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `user_id` | → `users(id)` CASCADE | |
| `name` | TEXT | |
| `frequency` | TEXT CHECK IN ('monthly','yearly') | |
| `due_month` | INTEGER NULL | only filled in (1-12) when `frequency = 'yearly'` |
| `estimated_value` | REAL | expected value, editable at any time |

**There is no boolean "paid" field** — payment status is always derived: is there a row in `transactions` with that `bill_id` and the `bill_year`/`bill_month` of the period being asked about? "Mark as paid" (`pay_bill`) just creates a normal linked expense transaction; "undo payment" is simply deleting that transaction (`delete_transaction`) — there's no dedicated undo logic.

"Pending" rule used on the Dashboard (computed in the frontend, not the backend): a monthly bill counts as pending if there's no payment in the current month; a yearly bill only becomes pending starting from `due_month` (and stays pending in the following months until paid).

### `dashboard_layout` — customizable Dashboard layout
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `user_id` | → `users(id)` CASCADE | |
| `card_key` | TEXT | matches a key in `CARD_CATALOG` (`src/components/dashboard-cards/catalog.ts`), e.g. `"lucro_mes"` |
| `x` / `y` | INTEGER | grid coordinates, in grid units (see below) — **not** a linear position |
| `size` | TEXT | one of the 9 values in `CardSize` (`"1x1"` .. `"3x3"`), no `CHECK` (see migration note above) |
| `visible` | INTEGER NOT NULL DEFAULT 1 | `0` when the user removed the card via the "Adicionar card" drawer — row (and its `x`/`y`/`size`) is kept, not deleted, so it reappears where it was if re-added |

Unique on `(user_id, card_key)` — one row per card per profile. `x`/`y`/`w`/`h` feed `react-grid-layout` directly; `w`/`h` aren't stored, they're derived from `size` via `SIZE_DIMENSIONS` in the frontend catalog (grid is 6 columns fixed — `GRID_COLS` — width step = 2 columns, height step = 1 row of 180px). Each catalog entry declares its own `allowedSizes` (a card is never offered a size that doesn't fit its content); resizing snaps to the nearest allowed size, never freeform.

Seeded on profile creation (`db::seed_default_dashboard_layout`, next to `seed_default_tags` in `create_user`) from `DEFAULT_DASHBOARD_LAYOUT`. Profiles that predate this feature get the same seed lazily, the first time `get_dashboard_layout` is called and finds zero rows for that user — so no dashboard ever renders empty. A card added to the catalog later does **not** retroactively appear for existing profiles — it only shows up in the "Adicionar card" drawer until the user adds it manually (new profiles created afterward do get it, via the updated `DEFAULT_DASHBOARD_LAYOUT`).

Layout changes (drag, resize, add/remove/show/hide) autosave with a short debounce (`save_dashboard_layout` replaces the whole per-profile row set in one transaction) — there is no explicit "save"/"discard" step in the edit mode ("✎ Personalizar" / "✓ Concluir" just toggles whether the grid accepts drag/resize).

### `config` — generic key/value
```
config(key TEXT PRIMARY KEY, value TEXT NOT NULL)
```
Today it holds `last_active_user_id` (profile remembered across restarts) and `backup_folder` (chosen folder for automatic `.db` backup, see `commands/backup.rs`). Same pattern as `Personal.TOTP`.
