import { fmt, fmtPct } from "../../lib/format";
import { MONTH_NAMES } from "../../strings";
import { DashboardCardProps } from "./catalog";

export function SaldoEmCaixaCard({ data }: DashboardCardProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-theme-border bg-theme-surface p-5">
      <div className="mb-2 font-mono text-xs uppercase tracking-wide text-theme-3">Saldo em caixa</div>
      <div className="text-3xl font-bold text-theme-1">{fmt(data.saldoAtual)}</div>
      <div className="mt-1 text-xs text-theme-4">acumulado · ajustado pelo que entra e sai</div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto border-t border-theme-border pt-3">
        {data.saldoHistory.length === 0 && <div className="text-xs text-theme-4">Nenhum mês anterior nesse ano</div>}
        {data.saldoHistory.map((h) => (
          <div key={h.month} className="flex items-center justify-between py-1">
            <span className="w-10 font-mono text-xs text-theme-4">{MONTH_NAMES[h.month - 1]}</span>
            <span className="flex-1 font-mono text-xs font-semibold text-theme-1">{fmt(h.saldo)}</span>
            <span
              className={`font-mono text-xs font-bold ${
                h.pctChange == null ? "text-theme-4" : h.pctChange >= 0 ? "text-violet-300" : "text-rose-400"
              }`}
            >
              {h.pctChange == null ? "—" : fmtPct(h.pctChange)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
