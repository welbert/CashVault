# Banco de dados

SQLite via `rusqlite` (feature `bundled` — não depende de SQLite instalado no sistema).
Arquivo único: `gerenciador.db` no diretório de dados do app (ver `docs/architecture.md`).

`PRAGMA foreign_keys = ON;` é setado em toda conexão aberta (`db::open_connection`) — sem isso os `ON DELETE CASCADE`/`SET NULL` abaixo não fariam nada.

## Padrão de schema/migração (`src-tauri/src/db.rs`)

Duas funções, chamadas nessa ordem em `open_connection`:

1. **`init_db`** — `CREATE TABLE IF NOT EXISTS` com o schema **completo e atual** de cada tabela. É o que roda numa instalação nova do zero.
2. **`migrate_db`** — `ALTER TABLE ... ADD COLUMN` idempotente (erro de "coluna já existe" é ignorado via `let _ = ...`) para bancos que já existiam **antes** de uma coluna/tabela nova ser adicionada.

**Regra ao adicionar uma coluna/tabela nova:** ela precisa entrar nos dois lugares — no `CREATE TABLE` dentro de `init_db` (pra quem instala do zero) **e** como `ALTER TABLE` em `migrate_db` (pra quem já tinha o banco). Qualquer `CREATE INDEX` que dependa dessa coluna nova só pode rodar **depois** que ela existir garantidamente — ou seja, dentro de `migrate_db`, nunca dentro do mesmo bloco `execute_batch` de `init_db` logo após o `CREATE TABLE IF NOT EXISTS` da tabela que a recebeu (isso já causou um bug real: ver commit/histórico do `idx_transactions_bill` — o índice foi colocado em `init_db` e quebrava em qualquer banco anterior à feature de Contas, porque ali a tabela já existia sem a coluna e o `CREATE TABLE IF NOT EXISTS` virava no-op).

## Tabelas

### `users` — perfis
| Coluna          | Tipo | Notas |
|-----------------|------|-------|
| `id`            | INTEGER PK | |
| `name`          | TEXT NOT NULL | |
| `password_hash` | TEXT NULL | reservado — sem senha implementada ainda |
| `password_salt` | BLOB NULL | reservado |
| `base_balance`  | REAL NOT NULL DEFAULT 0 | saldo inicial antes do primeiro lançamento |
| `created_at`    | TEXT | |

Excluir um usuário faz `ON DELETE CASCADE` em `transactions`, `targets`, `tags`, `bills`.

### `transactions` — movimentações (entradas/saídas)
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK | |
| `user_id` | INTEGER → `users(id)` CASCADE | |
| `type` | TEXT CHECK IN ('in','out') | |
| `name` | TEXT NOT NULL | |
| `date` | TEXT (`YYYY-MM-DD`) | |
| `amount` | REAL | valor da parcela quando faz parte de um grupo; valor cheio caso contrário |
| `installment_group_id` | INTEGER NULL → auto-referência `transactions(id)` | id da 1ª parcela do grupo (aponta pra si mesma) |
| `installment_index` / `installment_count` | INTEGER NULL | 1-based / total do grupo |
| `bill_id` | INTEGER NULL → `bills(id)` **SET NULL** | de qual conta esse pagamento veio |
| `bill_year` / `bill_month` | INTEGER NULL | período que esse pagamento quita (mês só é usado p/ contas mensais) |
| `created_at` / `updated_at` | TEXT | |

CHECK: os três campos de parcela são todos NULL ou todos preenchidos juntos.

Parcelamento gera **N linhas reais**, uma por mês (não um registro só com metadado informativo) — `create_installment_purchase` insere tudo numa única transação SQL, com a última parcela absorvendo o resto do arredondamento pra soma bater exato.

`bill_id` usa `ON DELETE SET NULL` de propósito: **excluir uma conta nunca apaga as movimentações já registradas**, elas só perdem a referência à conta de origem.

Índices: `(user_id, date)`, `(installment_group_id)`, `(bill_id, bill_year, bill_month)`.

### `targets` — metas e compras futuras
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK | |
| `user_id` | → `users(id)` CASCADE | |
| `kind` | TEXT CHECK IN ('goal','purchase') | |
| `name` | TEXT | |
| `target_value` | REAL | |

Metas (`goal`) e compras futuras (`purchase`) ficam na **mesma tabela** com um discriminador — mecanicamente são idênticas (nome + valor-alvo + progresso vs saldo total acumulado do perfil, sem reset por ano/mês). `list_targets` já devolve `pct`/`remaining` calculados a partir do saldo atual (`db::current_saldo`).

### `tags` + `transaction_tags` — tags (N-pra-N)
```
tags(id, user_id → users CASCADE, name, created_at)         -- único (user_id, name)
transaction_tags(transaction_id → transactions CASCADE,
                  tag_id → tags CASCADE,
                  PRIMARY KEY (transaction_id, tag_id))
```
Toda tag some junto com o perfil ou com a transação (cascade dos dois lados). `list_tags` devolve `usage_count` (join com `transaction_tags`) usado pra avisar antes de excluir uma tag em uso. Filtro por tag em `list_transactions` casa **qualquer uma** das tags selecionadas (OR), não todas.

Perfis novos já nascem com 8 tags padrão (`db::DEFAULT_TAGS`, seedadas em `create_user`): Lazer, Viagem, Alimentação, Transporte, Saúde, Moradia, Assinaturas, Educação.

### `bills` — contas (recorrentes)
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK | |
| `user_id` | → `users(id)` CASCADE | |
| `name` | TEXT | |
| `frequency` | TEXT CHECK IN ('monthly','yearly') | |
| `due_month` | INTEGER NULL | só preenchido (1-12) quando `frequency = 'yearly'` |
| `estimated_value` | REAL | valor esperado, editável a qualquer momento |

**Não existe um campo booleano "pago"** — o status de pagamento é sempre derivado: existe uma linha em `transactions` com esse `bill_id` e o `bill_year`/`bill_month` do período perguntado? "Marcar como pago" (`pay_bill`) só cria uma transação de saída normal vinculada; "desfazer pagamento" é simplesmente apagar essa transação (`delete_transaction`) — não tem lógica própria de undo.

Regra de "pendente" usada no Dashboard (calculada no frontend, não no backend): mensal conta como pendente se não há pagamento no mês corrente; anual só vira pendente a partir do `due_month` (e continua pendente nos meses seguintes até ser pago).

### `config` — chave/valor genérico
```
config(key TEXT PRIMARY KEY, value TEXT NOT NULL)
```
Hoje só guarda `last_active_user_id` (perfil lembrado entre reinícios). Mesmo padrão do `Personal.TOTP`.
