# Comandos Tauri

Todos registrados em `src-tauri/src/lib.rs` (`invoke_handler![...]`), implementados em `src-tauri/src/commands/<domínio>.rs`.
Wrapper tipado no frontend: `src/lib/api.ts` (`api.<domínio>.<método>`) — nenhum componente chama `invoke()` direto.

Argumentos são passados em camelCase do lado JS e convertidos automaticamente para snake_case nos parâmetros Rust (comportamento padrão do Tauri v2) — os nomes abaixo já estão no formato Rust.

## Perfis (`commands/users.rs`)

| Comando | Assinatura | Notas |
|---|---|---|
| `list_users` | `() -> Vec<UserSummary>` | |
| `create_user` | `(name, base_balance: Option<f64>) -> i64` | seeda as 8 tags padrão e vira o perfil ativo |
| `get_active_profile` | `() -> Option<UserSummary>` | lê `AppState.active_user_id` |
| `switch_active_profile` | `(user_id) -> ()` | grava `config.last_active_user_id` |
| `rename_user` | `(user_id, name) -> ()` | |
| `update_user_base_balance` | `(user_id, base_balance) -> ()` | |
| `delete_user` | `(user_id) -> ()` | cascade em transações/metas/tags/contas |

## Movimentações (`commands/transactions.rs`)

| Comando | Assinatura | Notas |
|---|---|---|
| `list_transactions` | `(user_id, year?, month?, start_date?, end_date?, tag_ids?: Vec<i64>) -> Vec<Transaction>` | filtro de tag é OR; sem `year`/`month`/`start_date`/`end_date` retorna tudo |
| `create_transaction` | `(user_id, kind, name, date, amount, tag_ids?) -> i64` | lançamento à vista |
| `create_installment_purchase` | `(user_id, name, first_date, total_amount, installment_count, tag_ids?) -> Vec<i64>` | gera N linhas numa única transação SQL |
| `update_transaction` | `(id, name, date, amount, tag_ids?: Vec<i64>) -> ()` | edita só a linha específica; `tag_ids: Some([])` limpa as tags, `None` mantém |
| `delete_transaction` | `(id) -> ()` | uma linha só |
| `delete_installment_group` | `(group_id) -> usize` | todas as parcelas do grupo |
| `update_installment_group_name` | `(group_id, name) -> ()` | renomeia todas as parcelas de uma vez |
| `list_installment_group` | `(group_id) -> Vec<Transaction>` | pra tela de "ver parcelas" |
| `get_years_with_data` / `get_months_with_data` | `(user_id[, year]) -> Vec<i64>` | alimenta os seletores de ano/mês |

## Metas & compras futuras (`commands/targets.rs`)

| Comando | Assinatura |
|---|---|
| `list_targets` | `(user_id, kind?: "goal"\|"purchase") -> Vec<Target>` (já com `pct`/`remaining`) |
| `create_target` | `(user_id, kind, name, target_value) -> i64` |
| `update_target` | `(id, name, target_value) -> ()` |
| `delete_target` | `(id) -> ()` |

## Tags (`commands/tags.rs`)

| Comando | Assinatura |
|---|---|
| `list_tags` | `(user_id) -> Vec<TagWithUsage>` (inclui `usage_count`) |
| `create_tag` | `(user_id, name) -> i64` (erro amigável se nome duplicado) |
| `rename_tag` | `(id, name) -> ()` |
| `delete_tag` | `(id) -> ()` (não avisa sobre uso — quem avisa é o frontend, usando `usage_count`) |

## Contas (`commands/bills.rs`)

| Comando | Assinatura | Notas |
|---|---|---|
| `list_bills` | `(user_id, year, month) -> Vec<BillStatus>` | `paid`/`paid_amount`/`paid_transaction_id` calculados pro período informado |
| `create_bill` | `(user_id, name, frequency, due_month?: i64, estimated_value) -> i64` | |
| `update_bill` | `(id, name, frequency, due_month?, estimated_value) -> ()` | |
| `delete_bill` | `(id) -> ()` | transações já pagas continuam existindo (`bill_id` vira NULL) |
| `pay_bill` | `(user_id, bill_id, year, month?: i64, amount, date) -> i64` | cria a transação de pagamento; devolve o id dela |

## Relatórios (`commands/reports.rs`)

`get_dashboard(user_id, year, month) -> DashboardData` — um único round-trip com tudo que o Dashboard precisa:
`month_totals`, `month_history` (meses anteriores do ano, com `pct_change`), `saldo_atual`, `saldo_history`, `year_series` (12 meses, pro gráfico), `year_balance_up_to_month`, `years_with_data`, `months_with_data`.

Toda agregação é feita em SQL (Rust), não trazendo linhas cruas pro TS somar — ver `db.rs` (`month_totals`, `saldo_up_to`, `prev_year_month`, etc).

## Exportação (`commands/export.rs`)

`export_transactions_csv(path, user_id, year?, month?, start_date?, end_date?) -> usize` — mesmo filtro de data de `list_transactions` (mas sem filtro de tag). Usa a crate `csv` (escapa corretamente vírgula/aspas). Path é escolhido no frontend via `@tauri-apps/plugin-dialog`.

## Logs (`commands/logging.rs`)

| Comando | Notas |
|---|---|
| `write_log(level, message)` | chamado por `src/logger.ts`, nunca direto por componentes |
| `open_log_dir()` | abre a pasta de logs no explorador (usado em Configurações → Diagnóstico) |
