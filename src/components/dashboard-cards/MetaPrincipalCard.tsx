import { GoalDonut } from "../charts/GoalDonut";
import { fmt } from "../../lib/format";
import { DashboardCardProps } from "./catalog";

export function MetaPrincipalCard({ primaryGoal, missingForGoal }: DashboardCardProps) {
  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-theme-border bg-theme-surface p-5 text-center">
      <div className="mb-2 font-mono text-xs uppercase tracking-wide text-theme-3">Meta principal</div>
      {primaryGoal ? (
        <>
          <GoalDonut pct={primaryGoal.pct} />
          <div className="mt-3 text-xs text-theme-3">
            faltam para a meta
            <strong className="mt-1 block text-xl font-semibold text-amber-600">{fmt(missingForGoal)}</strong>
          </div>
          <div className="mt-4 flex justify-between border-t border-theme-border pt-3 text-xs text-theme-3">
            <span>{primaryGoal.name}</span>
            <strong className="text-theme-1">
              {fmt(primaryGoal.currentSaldo)} de {fmt(primaryGoal.targetValue)}
            </strong>
          </div>
        </>
      ) : (
        <div className="py-6 text-sm text-theme-4">Nenhuma meta cadastrada ainda — crie uma em Metas &amp; Compras.</div>
      )}
    </div>
  );
}
