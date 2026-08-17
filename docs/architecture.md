# Arquitetura

## Visão geral

Duas camadas independentes que se comunicam via IPC do Tauri (`invoke`):

```
┌──────────────────────────────────────────────┐
│  Frontend  (React + TypeScript + Tailwind)   │
│                                               │
│  App → ProfileGate → AppShell → páginas      │
│        (Dashboard, Movimentações, Contas,    │
│         Metas & Compras, Tags, Configurações)│
└───────────────────┬───────────────────────────┘
                    │  invoke() (src/lib/api.ts)
┌───────────────────▼───────────────────────────┐
│  Backend  (Rust + Tauri v2)                  │
│                                               │
│  Comandos → SQLite (rusqlite)                │
└───────────────────────────────────────────────┘
```

| Camada     | Tecnologia                          |
|------------|--------------------------------------|
| UI         | React 19 + TypeScript + Tailwind v4  |
| Roteamento | react-router-dom v6                  |
| Gráficos   | Chart.js + react-chartjs-2           |
| Desktop    | Tauri v2                             |
| Backend    | Rust (comandos Tauri)                |
| Banco      | SQLite via `rusqlite` (bundled)      |
| Build      | Vite v7                              |

## Fluxo de dados — abertura do app

```
main.tsx (aplica tema, desabilita botão direito)
       │
       ▼
App.tsx → <ProfileGate>
       │
       ├─ invoke("get_active_profile")
       │     │
       │     ├─ existe perfil ativo → renderiza <AppShell><Outlet/></AppShell>
       │     │
       │     └─ nenhum ativo → invoke("list_users")
       │           ├─ lista vazia  → redireciona /perfil/novo
       │           └─ lista não vazia → mostra seletor de perfil inline
       │
       ▼
Dashboard (rota "/") → invoke("get_dashboard", {userId, year, month})
                     → invoke("list_bills", ...) para o alerta de contas
                     → invoke("list_targets", {kind:"goal"}) para a meta principal
```

Todo o estado de "qual perfil está ativo" vive em `ProfileContext` (frontend) e é espelhado no backend por `AppState.active_user_id` (em memória) + `config.last_active_user_id` (persistido — usado para lembrar o perfil entre reinícios do app).

## Ciclo de vida do processo

- **Sem tray, sem hide-on-close** — diferente do `Personal.TOTP`: fechar a janela (X) encerra o processo normalmente. Não há ícone na bandeja nem atalho global.
- **Sem autenticação ainda** — `users.password_hash`/`password_salt` existem no schema mas não são usados; qualquer perfil abre sem senha. Ver `docs/database.md`.
- Uma única conexão SQLite (`AppState.db: Mutex<Connection>`) compartilhada por todos os comandos.

## Diretório de dados

| SO      | Caminho                                                              |
|---------|------------------------------------------------------------------------|
| Windows | `%APPDATA%\com.welbert.cashvault\gerenciador.db`                       |
| macOS   | `~/Library/Application Support/com.welbert.cashvault/gerenciador.db`   |
| Linux   | `~/.local/share/com.welbert.cashvault/gerenciador.db`                  |

Logs ficam em `.../logs/log-YYYYMMDD.txt` no mesmo diretório base (ver `write_log`/`open_log_dir` em `docs/commands.md`).
