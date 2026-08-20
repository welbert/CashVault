# Frontend

## Routes (`src/App.tsx`)

```
/perfil/novo                outside ProfileGate — create profile screen

<ProfileGate>                checks get_active_profile, redirects or shows selector
  <AppShell>                 sidebar + <Outlet/>
    /                Dashboard.tsx
    /movimentacoes   Movimentacoes.tsx
    /contas          Contas.tsx
    /metas           ComprasEMetas.tsx
    /tags            TagsManager.tsx
    /configuracoes   Configuracoes.tsx
```

`ProfileGate` (`src/components/layout/ProfileGate.tsx`) is the only place that decides between: loading / inline profile selector / redirect to `/perfil/novo` / actually rendering the app.

## Pages (`src/pages/`)

| File | Content |
|---|---|
| `CreateProfile.tsx` | name + starting balance (optional) |
| `Dashboard.tsx` | income/expense/balance cards, flow chart (`FlowChart`), main goal (`GoalDonut`), pending bill banner + "projected expenses" row |
| `Movimentacoes.tsx` | filterable table (dynamic year via `get_years_with_data`, month, tags), CSV export |
| `Contas.tsx` | bill list with status for the **actual current** month/year (does not follow the Dashboard selector) |
| `ComprasEMetas.tsx` | two sections (`kind='goal'` / `kind='purchase'`) using the same `TargetList` |
| `TagsManager.tsx` | create/rename/delete tag, with a warning of how many transactions use it before deleting |
| `Configuracoes.tsx` | edit current profile, switch/create/delete profile, theme, open logs folder |

## Reusable components (`src/components/`)

| File | Use |
|---|---|
| `MoneyInput.tsx` | **every R$ value field uses this component** — never a raw `<input type="number">`. "Digit enters from the right" mask (1 → R$0.01, one more 0 → R$0.10), with backspace removing the last digit. See section below. |
| `TagPicker.tsx` | simple grid of tag chips — used only for the tag filter in `Movimentacoes` |
| `TagAssignPicker.tsx` | variant used in `TransactionModal` to **assign** tags: shows up to 8 most-used tags (sorted by `usageCount`, keeping already-selected ones visible even outside the top 8) and a "+" button that opens a search among the remaining tags or creates a new one on the spot (`onCreate`) |
| `TransactionModal.tsx` | create/edit an income or expense entry; one-time/installment toggle; "apply name to all installments" checkbox when editing an installment; uses `TagAssignPicker` |
| `InstallmentGroupModal.tsx` | view/delete installments of an installment purchase |
| `TargetModal.tsx` / `TargetList.tsx` | modal and list shared between goals and future purchases |
| `BillModal.tsx` / `PayBillModal.tsx` | create/edit a bill; record a payment (amount + date) |
| `TransactionRow.tsx` | entry row — shows an installment badge (clickable → opens `InstallmentGroupModal`) and tag chips |
| `YearMonthBar.tsx` | Dashboard's year/month selector — years come from `yearsWithData` + current year + selected year (never a fixed window) |
| `ConfirmModal.tsx` | generic confirmation modal (title + message + Confirm/Cancel, `danger` variant) — **replaces `window.confirm()`**, which doesn't work in this app's Tauri WebView2 (returns immediately without showing any dialog). Every "are you sure?" in the app goes through this |
| `DeleteTransactionModal.tsx` | delete confirmation for an entry (Dashboard and Movimentações); if the transaction is part of an installment purchase, shows 3 options (cancel / this installment only / all installments) instead of `ConfirmModal`'s default Confirm/Cancel |
| `charts/FlowChart.tsx` / `charts/GoalDonut.tsx` | `react-chartjs-2` wrappers |
| `layout/AppShell.tsx` | sidebar (app name + version via `getVersion()`, nav, current profile) + `<Outlet/>` |
| `layout/ProfileGate.tsx` | route gate (see above) |
| `ToastContainer.tsx` | renders the toasts from `ToastContext` |

## Hooks and context

| File | Content |
|---|---|
| `context/ProfileContext.tsx` | active profile + `refresh()` — source of truth, consumed via `hooks/useActiveProfile.ts` |
| `context/ToastContext.tsx` | `useToast().show(message, "success"\|"error")` — always use this instead of leaving a silent error in an `invoke` catch |
| `hooks/useDashboard.ts` | fetches `get_dashboard` for the current (userId, year, month), exposes `reload()` |
| `hooks/useEscapeClose.ts` | `useEscapeClose(active, onClose)` — closes a modal/dialog on Esc; used by every modal in the app (`TransactionModal`, `TargetModal`, `BillModal`, `PayBillModal`, `InstallmentGroupModal`, `ConfirmModal`) |

## Modals: closing with unsaved data

`TransactionModal`, `TargetModal`, `BillModal` and `PayBillModal` keep a snapshot of the initial values (via `useRef`, updated in the reset `useEffect`) and compute a `dirty` flag by comparing against the current state. Closing the modal (Esc, clicking outside, or the `✕` button) goes through an `attemptClose` function: if `dirty`, it opens a "leave without saving?" `ConfirmModal` instead of closing directly.

**Careful when nesting a `ConfirmModal` inside another already-open modal:** the `ConfirmModal`'s backdrop calls `e.stopPropagation()` before `onCancel()` — without that, the click would bubble up to the parent modal's backdrop (which also closes on outside click) and immediately reopen the confirmation.

## `src/lib/`

- `api.ts` — the only place that calls `invoke()`. TS types mirror the Rust `camelCase` structs (see `docs/commands.md`). When adding a new command, add it here too.
- `format.ts` — `fmt()` (pt-BR currency), `fmtDate()`, `fmtPct()`.

## Theme convention (tokens)

Never use a fixed Tailwind color (`bg-slate-900`, `text-gray-400`, etc.) for background/text/border — always the tokens defined in `src/index.css` and mapped via `@theme inline`:

| Category | Utilities |
|---|---|
| Background | `bg-theme-bg` `bg-theme-surface` `bg-theme-raised` `bg-theme-hover` |
| Border | `border-theme-border` |
| Text | `text-theme-1` `text-theme-2` `text-theme-3` `text-theme-4` |

Accent colors (`violet-*`, `rose-*`, `emerald-*`, `amber-*`) are intentionally fixed (income, expenses, success, alert) — they don't need to become a token.

## No i18n

The app is pt-BR only (a personal tool, unlike `Personal.TOTP`). Strings live directly in the components; the few shared ones (month names) are in `src/strings.ts`. Don't introduce `i18next` unless the scope changes to support another language.
