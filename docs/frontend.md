# Frontend

## Rotas (`src/App.tsx`)

```
/perfil/novo                fora do ProfileGate — tela de criar perfil

<ProfileGate>                verifica get_active_profile, redireciona ou mostra seletor
  <AppShell>                 sidebar + <Outlet/>
    /                Dashboard.tsx
    /movimentacoes   Movimentacoes.tsx
    /contas          Contas.tsx
    /metas           ComprasEMetas.tsx
    /tags            TagsManager.tsx
    /configuracoes   Configuracoes.tsx
```

`ProfileGate` (`src/components/layout/ProfileGate.tsx`) é o único lugar que decide entre: carregando / seletor de perfil inline / redirect pra `/perfil/novo` / renderizar o app de fato.

## Páginas (`src/pages/`)

| Arquivo | Conteúdo |
|---|---|
| `CreateProfile.tsx` | nome + saldo inicial (opcional) |
| `Dashboard.tsx` | cards de lucro/movimento/saldo, gráfico de fluxo (`FlowChart`), meta principal (`GoalDonut`), banner de conta pendente + linha "despesas previstas" |
| `Movimentacoes.tsx` | tabela filtrável (ano dinâmico via `get_years_with_data`, mês, tags), export CSV |
| `Contas.tsx` | lista de contas com status do mês/ano **atual real** (não segue o seletor do Dashboard) |
| `ComprasEMetas.tsx` | duas seções (`kind='goal'` / `kind='purchase'`) usando o mesmo `TargetList` |
| `TagsManager.tsx` | criar/renomear/excluir tag, com aviso de quantas movimentações usam antes de excluir |
| `Configuracoes.tsx` | editar perfil atual, trocar/criar/excluir perfil, tema, abrir pasta de logs |

## Componentes reaproveitáveis (`src/components/`)

| Arquivo | Uso |
|---|---|
| `MoneyInput.tsx` | **todo campo de valor em R$ usa este componente** — nunca `<input type="number">` cru. Máscara "dígito entra pela direita" (1 → R$0,01, mais um 0 → R$0,10), com backspace removendo o último dígito. Ver seção abaixo. |
| `TagPicker.tsx` | grade de chips de tag — usado tanto pra atribuir tags (`TransactionModal`) quanto pra filtrar (`Movimentacoes`) |
| `TransactionModal.tsx` | criar/editar entrada ou saída; toggle à vista/parcelado; checkbox "aplicar nome a todas as parcelas" quando edita uma parcela |
| `InstallmentGroupModal.tsx` | ver/excluir parcelas de uma compra parcelada |
| `TargetModal.tsx` / `TargetList.tsx` | modal e lista compartilhados entre metas e compras futuras |
| `BillModal.tsx` / `PayBillModal.tsx` | criar/editar conta; registrar pagamento (valor + data) |
| `TransactionRow.tsx` | linha de lançamento — mostra badge de parcela (clicável → abre `InstallmentGroupModal`) e chips de tag |
| `YearMonthBar.tsx` | seletor ano/mês do Dashboard — anos vêm de `yearsWithData` + ano atual + ano selecionado (nunca uma janela fixa) |
| `charts/FlowChart.tsx` / `charts/GoalDonut.tsx` | wrappers `react-chartjs-2` |
| `layout/AppShell.tsx` | sidebar (nome do app + versão via `getVersion()`, nav, perfil atual) + `<Outlet/>` |
| `layout/ProfileGate.tsx` | gate de rota (ver acima) |
| `ToastContainer.tsx` | renderiza os toasts do `ToastContext` |

## Hooks e contexto

| Arquivo | Conteúdo |
|---|---|
| `context/ProfileContext.tsx` | perfil ativo + `refresh()` — fonte da verdade, consumido via `hooks/useActiveProfile.ts` |
| `context/ToastContext.tsx` | `useToast().show(message, "success"\|"error")` — sempre usar em vez de deixar erro silencioso em catch de `invoke` |
| `hooks/useDashboard.ts` | busca `get_dashboard` pro (userId, year, month) atual, expõe `reload()` |

## `src/lib/`

- `api.ts` — único lugar que chama `invoke()`. Tipos TS espelham as structs `camelCase` do Rust (ver `docs/commands.md`). Ao adicionar um comando novo, adicionar aqui também.
- `format.ts` — `fmt()` (moeda pt-BR), `fmtDate()`, `fmtPct()`.

## Convenção de tema (tokens)

Nunca usar cor fixa do Tailwind (`bg-slate-900`, `text-gray-400`, etc.) pra fundo/texto/borda — sempre os tokens definidos em `src/index.css` e mapeados via `@theme inline`:

| Categoria | Utilitários |
|---|---|
| Fundo | `bg-theme-bg` `bg-theme-surface` `bg-theme-raised` `bg-theme-hover` |
| Borda | `border-theme-border` |
| Texto | `text-theme-1` `text-theme-2` `text-theme-3` `text-theme-4` |

Cores de destaque (`violet-*`, `rose-*`, `emerald-*`, `amber-*`) são fixas de propósito (entradas, saídas, sucesso, alerta) — não precisam virar token.

## Sem i18n

O app é pt-BR only (ferramenta pessoal, ao contrário do `Personal.TOTP`). Strings ficam direto nos componentes; as poucas compartilhadas (nomes de mês) estão em `src/strings.ts`. Não introduzir `i18next` a menos que o escopo mude pra suportar outro idioma.
