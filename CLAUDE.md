# CashVault — CLAUDE.md

App desktop de finanças pessoais (multi-perfil). Controla entradas/saídas, compras parceladas (viram N lançamentos mensais reais), metas de longo prazo e compras futuras (progresso vs saldo acumulado, sem reset anual), tags, contas recorrentes (mensais/anuais) e exportação CSV. Modelado na mesma arquitetura do projeto irmão `Personal.TOTP`, mas sem tray/hotkey/senha — é uma janela normal.

## Regra de versionamento

**Ao subir a versão, atualize os 3 arquivos em sincronia** — eles sempre precisam bater:

| Arquivo | Campo |
|------|-------|
| `package.json` | `"version"` (linha 5) |
| `src-tauri/Cargo.toml` | `version` (linha 3) |
| `src-tauri/tauri.conf.json` | `"version"` (linha 4) |

Ver [docs/versioning.md](docs/versioning.md) para as regras de semver.

## Regra de campo monetário

**Todo input de valor em R$ usa o componente `MoneyInput`** (`src/components/MoneyInput.tsx`) — nunca um `<input type="number">` cru. Ele já implementa a máscara "dígito entra pela direita" (1 → R$0,01) usada em todo o app. Ver `docs/frontend.md`.

## Regra de tema (tokens)

Nunca hardcodar cor de fundo/texto/borda do Tailwind (`bg-slate-*`, `text-gray-*`...) — sempre os tokens `bg-theme-*` / `text-theme-*` / `border-theme-border` definidos em `src/index.css`. Cores de destaque (`violet`, `rose`, `emerald`, `amber`) são intencionais e ficam como estão. Ver `docs/frontend.md`.

## Regra de schema (init_db + migrate_db)

Toda tabela/coluna nova entra em **dois lugares** em `src-tauri/src/db.rs`: o `CREATE TABLE` completo dentro de `init_db` (instalação nova) e um `ALTER TABLE` idempotente equivalente dentro de `migrate_db` (quem já tinha o banco). Um `CREATE INDEX` que referencia a coluna nova só pode ficar em `migrate_db`, nunca colado no `CREATE TABLE IF NOT EXISTS` de `init_db` — se a tabela já existia antes da coluna, esse `CREATE TABLE IF NOT EXISTS` vira no-op e a coluna não existe ainda naquele ponto (isso já quebrou o app uma vez, ver `docs/database.md`).

## Stack

| Camada     | Tecnologia                          |
|------------|--------------------------------------|
| UI         | React 19 + TypeScript + Tailwind v4  |
| Roteamento | react-router-dom v6                  |
| Desktop    | Tauri v2                             |
| Backend    | Rust (comandos Tauri)                |
| Banco      | SQLite via `rusqlite` (bundled)      |
| Gráficos   | Chart.js + react-chartjs-2           |
| Build      | Vite v7                              |

**Gerenciador de pacotes: pnpm** (não usar npm/yarn).

## Comandos

```bash
pnpm tauri dev        # dev com hot-reload (Rust + frontend)
pnpm tauri build      # build de produção (instalador em src-tauri/target/release/bundle)
pnpm build            # só o frontend (tsc + vite build)
cargo check           # dentro de src-tauri/ — type-check rápido do backend sem gerar binário
```

Se `pnpm install`/`pnpm build` reclamar de build script ignorado (esbuild): `pnpm approve-builds --all`.

## Estrutura

```
CashVault/
├── src/
│   ├── App.tsx                  # rotas (ver docs/frontend.md)
│   ├── main.tsx                 # aplica tema + desabilita botão direito antes do render
│   ├── theme.ts / logger.ts     # helpers de tema e logging (mesmo padrão do Personal.TOTP)
│   ├── pages/                   # uma por rota
│   ├── components/              # ver docs/frontend.md
│   ├── context/                 # ProfileContext, ToastContext
│   ├── hooks/                   # useActiveProfile, useDashboard
│   └── lib/
│       ├── api.ts               # único lugar que chama invoke() — tipos espelham as structs Rust
│       └── format.ts            # fmt() moeda, fmtDate(), fmtPct()
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs               # AppState, setup, registro de comandos
│   │   ├── db.rs                # schema (init_db + migrate_db), agregações (saldo, totais)
│   │   ├── models.rs            # structs serializadas (camelCase) devolvidas pro frontend
│   │   └── commands/            # um arquivo por domínio (users, transactions, targets, tags, bills, reports, export, logging)
│   ├── Cargo.toml
│   ├── tauri.conf.json          # identifier com.welbert.cashvault, janela 1280x860
│   └── capabilities/default.json
└── docs/                        # documentação técnica (abaixo)
```

## Documentação técnica

| Arquivo | Conteúdo |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Camadas, fluxo de dados na abertura do app, ciclo de vida do processo, diretório de dados |
| [docs/database.md](docs/database.md) | Schema completo do SQLite, padrão de migração, o que cada tabela faz |
| [docs/commands.md](docs/commands.md) | Todos os comandos Tauri, por domínio, com assinatura |
| [docs/frontend.md](docs/frontend.md) | Rotas, páginas, componentes reaproveitáveis, hooks/contexto, convenções (tema, i18n) |
| [docs/versioning.md](docs/versioning.md) | Regras de semver, arquivos a atualizar |

## Comportamentos-chave

- **Fechar a janela** → encerra o processo (sem tray, ao contrário do `Personal.TOTP`)
- **Botão direito** → menu de contexto desabilitado globalmente
- **Multi-perfil** → perfil ativo é lembrado entre reinícios (`config.last_active_user_id`); trocar de perfil fica em Configurações
- **Parcelas** → geradas como N lançamentos mensais reais na criação (não um registro só); editar/excluir pode ser por parcela ou pro grupo inteiro
- **Metas/compras futuras** → progresso é sempre vs saldo total acumulado do perfil, nunca reseta por ano
- **Tags** → N-pra-N com movimentações; filtro casa qualquer uma das tags selecionadas (OR)
- **Contas** → não existe campo "pago" solto — o status é sempre derivado de existir (ou não) uma movimentação vinculada àquele período; excluir a conta nunca apaga movimentações já registradas
- **Exportar CSV** → sempre respeita o filtro (ano/mês) selecionado na tela de Movimentações
- **Logger** → usar `logger.*` (`src/logger.ts`) em vez de `console.*` direto; grava em arquivo, acessível via Configurações → Diagnóstico → Abrir pasta de logs

## Adicionando funcionalidades

### Novo comando Rust
1. Escrever `#[tauri::command] pub fn nome(...)` em `src-tauri/src/commands/<domínio>.rs` (criar arquivo novo se for um domínio novo, registrar em `commands/mod.rs`)
2. Registrar em `.invoke_handler(tauri::generate_handler![..., commands::<domínio>::nome])` em `lib.rs`
3. Adicionar o wrapper tipado correspondente em `src/lib/api.ts`

### Nova tabela/coluna
Ver "Regra de schema" acima e `docs/database.md`.

### Nova dependência
```bash
cd src-tauri && cargo add <crate>   # Rust
pnpm add <pacote>                   # frontend (ou pnpm add -D pra dev)
```

## Notas de ambiente

- Windows: usar `python` (não `python3`) no terminal
- Identifier do Tauri: `com.welbert.cashvault` — diferente do `Personal.TOTP`, cada app tem sua própria pasta de dados
- Ícone do app: gerado a partir de uma imagem fonte com `pnpm tauri icon <arquivo.png>` (regenera todo `src-tauri/icons/`)
