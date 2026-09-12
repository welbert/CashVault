import { fmt } from "../../lib/format";
import { DashboardCardProps } from "./catalog";

export function ResumoDoMesCard({ data, pendingBills, previstas, onNewIncome, onNewExpense }: DashboardCardProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-theme-border bg-theme-surface p-5">
      <div className="mb-4 font-mono text-xs uppercase tracking-wide text-theme-3">Resumo do mês</div>
      <div className="flex items-center justify-between border-b border-theme-border py-2.5">
        <span className="text-sm text-violet-300">↘ recebido</span>
        <span className="font-mono text-base font-semibold text-violet-300">{fmt(data.monthTotals.inTotal)}</span>
      </div>
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm text-rose-400">↗ despesas</span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-base font-semibold text-rose-400">{fmt(data.monthTotals.outTotal)}</span>
          {pendingBills.length > 0 && (
            <span className="cursor-help text-xs text-amber-600" title={`Despesas previstas: ${fmt(previstas)}`}>
              ⏳
            </span>
          )}
        </span>
      </div>
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
    </div>
  );
}
