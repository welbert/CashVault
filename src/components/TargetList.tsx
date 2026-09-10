import { Target } from "../lib/api";
import { fmt } from "../lib/format";

type Props = {
  targets: Target[];
  onEdit: (target: Target) => void;
  onDelete: (id: number) => void;
  onSetPrimary: (id: number) => void;
  emptyLabel: string;
};

export function TargetList({ targets, onEdit, onDelete, onSetPrimary, emptyLabel }: Props) {
  if (targets.length === 0) {
    return <div className="py-3 text-center text-sm text-theme-4">{emptyLabel}</div>;
  }

  // Sem nenhuma marcada como principal ainda, a primeira cadastrada é a que o
  // Dashboard usa por padrão (mesmo fallback de `Dashboard.tsx`) — reflete isso aqui.
  const effectivePrimaryId = targets.find((t) => t.isPrimary)?.id ?? targets[0].id;

  return (
    <div className="flex flex-col divide-y divide-theme-border">
      {targets.map((t) => {
        const enough = t.remaining >= 0;
        const isPrimary = t.id === effectivePrimaryId;
        return (
          <div key={t.id} className="group flex items-center gap-4 py-3">
            <button
              onClick={() => onSetPrimary(t.id)}
              title={isPrimary ? "Principal — aparece no Dashboard" : "Definir como principal"}
              className={`shrink-0 text-base ${isPrimary ? "text-amber-500" : "text-theme-4 hover:text-amber-500"}`}
            >
              {isPrimary ? "★" : "☆"}
            </button>
            <div className="w-28 shrink-0 truncate text-sm font-semibold text-theme-1">{t.name}</div>
            <div className="min-w-[60px] flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-theme-hover">
                <div
                  className={`h-full rounded-full transition-all ${
                    enough ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "bg-gradient-to-r from-violet-700 to-violet-300"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, t.pct))}%` }}
                />
              </div>
            </div>
            <div className={`w-12 shrink-0 text-right font-mono text-sm font-bold ${enough ? "text-emerald-400" : "text-theme-1"}`}>
              {Math.round(t.pct)}%
            </div>
            <div className="w-24 shrink-0 text-right font-mono text-sm font-semibold text-theme-1">{fmt(t.targetValue)}</div>
            <div className={`w-28 shrink-0 text-right font-mono text-xs font-semibold ${enough ? "text-violet-300" : "text-rose-400"}`}>
              {enough ? `+ ${fmt(t.remaining)}` : `− ${fmt(Math.abs(t.remaining))}`}
            </div>
            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button onClick={() => onEdit(t)} className="rounded p-1 text-theme-4 hover:text-violet-300" title="Editar">
                ✎
              </button>
              <button onClick={() => onDelete(t.id)} className="rounded p-1 text-theme-4 hover:text-rose-400" title="Remover">
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
