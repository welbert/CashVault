import { TransactionRow } from "../TransactionRow";
import { fmt } from "../../lib/format";
import { MONTH_NAMES } from "../../strings";
import { DashboardCardProps } from "./catalog";

export function MovimentoDoMesCard({
  data,
  month,
  monthTxns,
  pendingBills,
  previstas,
  onNewIncome,
  onNewExpense,
  onEditTransaction,
  onDeleteTransaction,
  onViewGroup,
}: DashboardCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-theme-border bg-theme-surface p-5">
      <div className="mb-4 font-mono text-xs uppercase tracking-wide text-theme-3">Movimento do mês</div>
      <div className="flex items-center justify-between border-b border-theme-border py-2.5">
        <span className="text-sm text-violet-300">↘ recebido</span>
        <span className="font-mono text-base font-semibold text-violet-300">{fmt(data.monthTotals.inTotal)}</span>
      </div>
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm text-rose-400">↗ despesas</span>
        <span className="font-mono text-base font-semibold text-rose-400">{fmt(data.monthTotals.outTotal)}</span>
      </div>
      {pendingBills.length > 0 && (
        <div className="flex items-center justify-between border-t border-theme-border py-2.5">
          <span className="text-sm text-amber-600">⏳ despesas previstas</span>
          <span className="font-mono text-base font-semibold text-amber-600">{fmt(previstas)}</span>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onNewIncome}
          className="flex-1 rounded-full border border-violet-400/35 bg-theme-bg py-2 text-xs font-semibold text-theme-1 hover:bg-gradient-to-br hover:from-violet-700 hover:to-violet-300 hover:text-theme-bg"
        >
          + Entrada
        </button>
        <button
          onClick={onNewExpense}
          className="flex-1 rounded-full border border-rose-400/35 bg-theme-bg py-2 text-xs font-semibold text-theme-1 hover:bg-gradient-to-br hover:from-rose-600 hover:to-rose-400 hover:text-theme-bg"
        >
          + Saída
        </button>
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-theme-border pt-3">
        {monthTxns.length === 0 && (
          <div className="py-2 text-center text-xs text-theme-4">Nenhum lançamento em {MONTH_NAMES[month - 1]} ainda</div>
        )}
        {monthTxns.map((t) => (
          <TransactionRow key={t.id} transaction={t} onEdit={onEditTransaction} onDelete={onDeleteTransaction} onViewGroup={onViewGroup} />
        ))}
      </div>
    </div>
  );
}
