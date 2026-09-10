# Tauri Commands

All registered in `src-tauri/src/lib.rs` (`invoke_handler![...]`), implemented in `src-tauri/src/commands/<domain>.rs`.
Typed wrapper on the frontend: `src/lib/api.ts` (`api.<domain>.<method>`) — no component calls `invoke()` directly.

Arguments are passed in camelCase on the JS side and automatically converted to snake_case for the Rust parameters (Tauri v2 default behavior) — the names below are already in Rust format.

## Profiles (`commands/users.rs`)

| Command | Signature | Notes |
|---|---|---|
| `list_users` | `() -> Vec<UserSummary>` | |
| `create_user` | `(name, base_balance: Option<f64>) -> i64` | seeds the 8 default tags and becomes the active profile |
| `get_active_profile` | `() -> Option<UserSummary>` | reads `AppState.active_user_id` |
| `switch_active_profile` | `(user_id) -> ()` | writes `config.last_active_user_id` |
| `rename_user` | `(user_id, name) -> ()` | |
| `update_user_base_balance` | `(user_id, base_balance) -> ()` | |
| `delete_user` | `(user_id) -> ()` | cascades to transactions/goals/tags/bills |

## Transactions (`commands/transactions.rs`)

| Command | Signature | Notes |
|---|---|---|
| `list_transactions` | `(user_id, year?, month?, start_date?, end_date?, tag_ids?: Vec<i64>) -> Vec<Transaction>` | tag filter is OR; without `year`/`month`/`start_date`/`end_date` returns everything |
| `create_transaction` | `(user_id, kind, name, date, amount, tag_ids?) -> i64` | one-time entry |
| `create_installment_purchase` | `(user_id, name, first_date, total_amount, installment_count, tag_ids?) -> Vec<i64>` | generates N rows in a single SQL transaction |
| `update_transaction` | `(id, name, date, amount, tag_ids?: Vec<i64>) -> ()` | edits only the specific row; `tag_ids: Some([])` clears the tags, `None` keeps them |
| `delete_transaction` | `(id) -> ()` | a single row |
| `delete_installment_group` | `(group_id) -> usize` | all installments in the group |
| `update_installment_group_name` | `(group_id, name) -> ()` | renames all installments at once |
| `list_installment_group` | `(group_id) -> Vec<Transaction>` | for the "view installments" screen |
| `get_years_with_data` / `get_months_with_data` | `(user_id[, year]) -> Vec<i64>` | feeds the year/month selectors |

## Goals & future purchases (`commands/targets.rs`)

| Command | Signature |
|---|---|
| `list_targets` | `(user_id, kind?: "goal"\|"purchase") -> Vec<Target>` (already with `pct`/`remaining`/`is_primary`) |
| `create_target` | `(user_id, kind, name, target_value) -> i64` |
| `update_target` | `(id, name, target_value) -> ()` |
| `delete_target` | `(id) -> ()` |
| `set_primary_target` | `(id) -> ()` — clears `is_primary` for every other target of the same `(user_id, kind)`, then sets it on `id` (one transaction); this is what the Dashboard's "Meta/Compra principal" cards show |

## Tags (`commands/tags.rs`)

| Command | Signature |
|---|---|
| `list_tags` | `(user_id) -> Vec<TagWithUsage>` (includes `usage_count`) |
| `create_tag` | `(user_id, name) -> i64` (friendly error if name is duplicated) |
| `rename_tag` | `(id, name) -> ()` |
| `delete_tag` | `(id) -> ()` (doesn't warn about usage — that's the frontend's job, using `usage_count`) |

## Bills (`commands/bills.rs`)

| Command | Signature | Notes |
|---|---|---|
| `list_bills` | `(user_id, year, month) -> Vec<BillStatus>` | `paid`/`paid_amount`/`paid_transaction_id` computed for the given period |
| `create_bill` | `(user_id, name, frequency, due_month?: i64, estimated_value) -> i64` | |
| `update_bill` | `(id, name, frequency, due_month?, estimated_value) -> ()` | |
| `delete_bill` | `(id) -> ()` | already-paid transactions keep existing (`bill_id` becomes NULL) |
| `pay_bill` | `(user_id, bill_id, year, month?: i64, amount, date) -> i64` | creates the payment transaction; returns its id |

## Reports (`commands/reports.rs`)

`get_dashboard(user_id, year, month) -> DashboardData` — a single round-trip with everything the Dashboard needs:
`month_totals`, `month_history` (previous months of the year, with `pct_change`), `saldo_atual`, `saldo_history`, `year_series` (12 months, for the chart), `year_balance_up_to_month`, `years_with_data`, `months_with_data`, `in_by_tag`/`out_by_tag` (`Vec<TagAmount { label, total }>` for the selected month — one bucket per tag plus `"Sem tag"` for untagged transactions; a transaction with multiple tags counts in full toward each one, same OR semantics as the tag filter elsewhere; capped at the top 5 by value with the rest collapsed into `"Outros"`, see `TAG_CHART_LIMIT` in `commands/reports.rs`).

All aggregation is done in SQL (Rust), rather than bringing raw rows to TS to sum — see `db.rs` (`month_totals`, `saldo_up_to`, `prev_year_month`, etc).

## Dashboard layout (`commands/dashboard_layout.rs`)

| Command | Signature | Notes |
|---|---|---|
| `get_dashboard_layout` | `(user_id) -> Vec<DashboardLayoutItem { card_key, x, y, size, visible }>` | if the profile has zero rows (predates the feature), seeds the default layout first (`db::seed_default_dashboard_layout`), then returns it — a dashboard never renders empty |
| `save_dashboard_layout` | `(user_id, items: Vec<DashboardLayoutItem>) -> ()` | replaces the whole set of rows for that profile in one transaction (delete all + re-insert); called with a short debounce on every drag/resize/add/remove/show/hide in the Dashboard's edit mode — there's no separate "save" step |

## Export (`commands/export.rs`)

`export_transactions_csv(path, user_id, year?, month?, start_date?, end_date?) -> usize` — same date filter as `list_transactions` (but no tag filter). Uses the `csv` crate (correctly escapes commas/quotes). Path is chosen on the frontend via `@tauri-apps/plugin-dialog`.

## Import (`commands/import.rs`)

`import_transactions_csv(path, user_id) -> ImportResult { imported: usize, errors: Vec<String> }` — reads the same `tipo,nome,data,valor[,parcela]` header as the export (column order doesn't matter, `parcela` is ignored — every row becomes a plain one-time transaction, never an installment group). Tolerant of CSVs edited in Excel pt-BR: auto-detects `;` as the delimiter, accepts `1.234,56` or `1234.56` for `valor` and `dd/mm/aaaa` or `aaaa-mm-dd` for `data`, strips a UTF-8 BOM if present. Runs inside a single SQL transaction; invalid rows are skipped and reported in `errors` (1-indexed CSV line number) instead of aborting the whole import.

## Backup (`commands/backup.rs`)

| Command | Signature | Notes |
|---|---|---|
| `get_backup_folder` | `() -> Option<String>` | reads `config.backup_folder` |
| `set_backup_folder` | `(path) -> ()` | upserts `config.backup_folder`; chosen on the frontend via `@tauri-apps/plugin-dialog`'s directory picker |
| `clear_backup_folder` | `() -> ()` | deletes the `config.backup_folder` row — disables automatic backup |
| `run_backup` | `() -> ()` | no-op if no folder is configured; otherwise copies the live `.db` file to `<folder>/cashvault-backup.db`, overwriting the previous backup. Called once on every app startup (`AppShell` mount) and immediately after picking/changing the folder in Settings |
| `import_backup` | `(path) -> ()` | validates the chosen `.db` file (must have a `users` table) before touching anything, then swaps `AppState`'s live connection for an in-memory one and overwrites the real db file with it — the frontend must call `relaunch()` (`@tauri-apps/plugin-process`) right after, since the in-memory swap leaves the running process with a dead connection until restart |

## Logs (`commands/logging.rs`)

| Command | Notes |
|---|---|
| `write_log(level, message)` | called by `src/logger.ts`, never directly by components |
| `open_log_dir()` | opens the logs folder in the file explorer (used in Settings → Diagnostics) |
