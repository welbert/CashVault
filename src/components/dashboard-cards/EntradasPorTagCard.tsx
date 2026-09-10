import { TagPieChart } from "../charts/TagPieChart";
import { MONTH_NAMES } from "../../strings";
import { DashboardCardProps } from "./catalog";

export function EntradasPorTagCard({ data, month }: DashboardCardProps) {
  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-theme-border bg-theme-surface p-5">
      <div className="mb-4 font-mono text-xs uppercase tracking-wide text-theme-3">Entradas por tag · {MONTH_NAMES[month - 1]}</div>
      <TagPieChart data={data.inByTag} />
    </div>
  );
}
