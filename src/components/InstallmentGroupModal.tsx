import { useEffect, useState } from "react";
import { api, Transaction } from "../lib/api";
import { fmt, fmtDate } from "../lib/format";
import { logger } from "../logger";

type Props = {
  groupId: number | null;
  onClose: () => void;
  onDeleteRow: (id: number) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
};

export function InstallmentGroupModal({ groupId, onClose, onDeleteRow, onDeleteGroup }: Props) {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    api.transactions
      .listInstallmentGroup(groupId)
      .then(setRows)
      .catch((err) => logger.error("falha ao listar parcelas", err))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (!groupId) return null;

  async function handleDeleteRow(id: number) {
    await onDeleteRow(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleDeleteGroup() {
    if (!groupId) return;
    const ok = window.confirm(`Remover todas as ${rows.length} parcelas desta compra?`);
    if (!ok) return;
    await onDeleteGroup(groupId);
    onClose();
  }

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-violet-400/20 bg-theme-surface p-7" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-theme-1">{rows[0]?.name ?? "Parcelas"}</h3>
          <button onClick={onClose} className="text-theme-4 hover:text-theme-1">
            ✕
          </button>
        </div>

        {loading && <div className="py-4 text-center text-sm text-theme-4">Carregando...</div>}

        {!loading && (
          <div className="flex max-h-80 flex-col divide-y divide-theme-border overflow-y-auto">
            {rows.map((r) => (
              <div key={r.id} className="group flex items-center justify-between py-2.5 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs text-theme-3">
                    Parcela {r.installmentIndex}/{r.installmentCount}
                  </span>
                  <span className="font-mono text-[11px] text-theme-4">{fmtDate(r.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-rose-400">{fmt(r.amount)}</span>
                  <button
                    onClick={() => handleDeleteRow(r.id)}
                    className="w-4 text-theme-4 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                    title="Remover esta parcela"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-theme-border pt-4 text-sm text-theme-3">
          <span>Total da compra</span>
          <strong className="font-mono text-base text-theme-1">{fmt(total)}</strong>
        </div>

        <button
          onClick={handleDeleteGroup}
          className="mt-4 w-full rounded-xl border border-rose-500/30 bg-theme-bg py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/10"
        >
          Excluir todas as parcelas desta compra
        </button>
      </div>
    </div>
  );
}
