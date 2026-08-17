import { Transaction } from "../lib/api";
import { fmt, fmtDate } from "../lib/format";

type Props = {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  onViewGroup?: (t: Transaction) => void;
};

export function TransactionRow({ transaction: t, onEdit, onDelete, onViewGroup }: Props) {
  const hasGroup = !!(t.installmentIndex && t.installmentCount);
  return (
    <div className="group flex items-center justify-between py-2 text-sm">
      <div className="flex flex-col gap-0.5 overflow-hidden">
        <span className="truncate font-medium text-theme-1">
          {t.name}
          {hasGroup &&
            (onViewGroup ? (
              <button
                onClick={() => onViewGroup(t)}
                className="ml-1 font-mono text-[11px] text-theme-4 underline decoration-dotted hover:text-violet-300"
                title="Ver todas as parcelas"
              >
                · {t.installmentIndex}/{t.installmentCount}
              </button>
            ) : (
              <span className="ml-1 font-mono text-[11px] text-theme-4">
                · {t.installmentIndex}/{t.installmentCount}
              </span>
            ))}
        </span>
        <span className="font-mono text-[11px] text-theme-4">{fmtDate(t.date)}</span>
        {t.tags.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {t.tags.map((tag) => (
              <span key={tag.id} className="rounded-full bg-theme-hover px-2 py-0.5 text-[10px] text-theme-3">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`font-mono font-semibold ${t.type === "in" ? "text-violet-300" : "text-rose-400"}`}>
          {t.type === "in" ? "+" : "−"} {fmt(t.amount)}
        </span>
        <button
          onClick={() => onEdit(t)}
          className="w-4 text-theme-4 opacity-0 transition-opacity hover:text-violet-300 group-hover:opacity-100"
          title="Editar"
        >
          ✎
        </button>
        <button
          onClick={() => onDelete(t)}
          className="w-4 text-theme-4 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
          title="Remover"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
