import { FlowChart } from "../charts/FlowChart";
import { fmt } from "../../lib/format";
import { DashboardCardProps } from "./catalog";

export function FluxoDeCaixaCard({ data, year }: DashboardCardProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-2xl border border-theme-border bg-theme-surface p-6">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Fluxo de caixa · ano {year}</span>
        <div className="flex gap-4 text-xs text-theme-3">
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full bg-violet-300" />
            Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full bg-rose-400" />
            Saídas
          </span>
        </div>
      </div>
      <FlowChart series={data.yearSeries} />
      <div className="mt-4 flex items-center justify-between border-t border-theme-border pt-4 text-sm text-theme-3">
        <span>Saldo do ano até o mês selecionado</span>
        <strong className="font-mono text-base text-violet-300">{fmt(data.yearBalanceUpToMonth)}</strong>
      </div>
    </div>
  );
}
