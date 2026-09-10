import { fmtPct } from "../../lib/format";
import { MONTH_NAMES } from "../../strings";
import { DashboardCardProps } from "./catalog";

export function VariacaoMensalCard({ data, month }: DashboardCardProps) {
  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-theme-border bg-theme-surface p-5">
      <div className="mb-2 font-mono text-xs uppercase tracking-wide text-theme-3">Variação mensal</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {MONTH_NAMES.map((name, i) => {
          const m = i + 1;
          if (m > month) {
            return (
              <div key={m} className="min-w-[42px] flex-1 rounded-lg bg-theme-hover/40 py-2 text-center text-[9px] uppercase text-theme-4 opacity-30">
                ···
              </div>
            );
          }
          const summary = m === month ? data.monthTotals : data.monthHistory.find((h) => h.month === m);
          const pct = summary?.pctChange ?? null;
          return (
            <div
              key={m}
              className={`min-w-[42px] flex-1 rounded-lg py-2 text-center ${
                m === month ? "border border-violet-400/50 bg-violet-400/10" : "bg-theme-hover/40"
              }`}
            >
              <div className="font-mono text-[10.5px] uppercase text-theme-4">{name}</div>
              <div className={`font-mono text-[13px] font-bold ${pct == null ? "text-theme-4" : pct >= 0 ? "text-violet-300" : "text-rose-400"}`}>
                {pct == null ? "—" : fmtPct(pct)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
