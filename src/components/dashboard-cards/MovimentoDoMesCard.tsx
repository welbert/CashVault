import { TransactionRow } from "../TransactionRow";
import { MONTH_NAMES } from "../../strings";
import { DashboardCardProps } from "./catalog";

export function MovimentoDoMesCard({ month, monthTxns, onEditTransaction, onDeleteTransaction, onViewGroup }: DashboardCardProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-theme-border bg-theme-surface p-5">
      <div className="mb-2 font-mono text-xs uppercase tracking-wide text-theme-3">Movimento do mês</div>
      <div className="min-h-0 flex-1 overflow-y-auto">
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
