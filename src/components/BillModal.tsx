import { FormEvent, useEffect, useRef, useState } from "react";
import { useEscapeClose } from "../hooks/useEscapeClose";
import { BillFrequency, BillStatus } from "../lib/api";
import { ConfirmModal } from "./ConfirmModal";
import { MoneyInput } from "./MoneyInput";
import { MONTH_NAMES } from "../strings";

type Props = {
  open: boolean;
  editing: BillStatus | null;
  onClose: () => void;
  onSubmit: (data: { name: string; frequency: BillFrequency; dueMonth?: number; estimatedValue: number }) => Promise<void>;
};

export function BillModal({ open, editing, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<BillFrequency>("monthly");
  const [dueMonth, setDueMonth] = useState(1);
  const [estimatedValue, setEstimatedValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const initialRef = useRef({ name: "", frequency: "monthly" as BillFrequency, dueMonth: 1, estimatedValue: 0 });

  useEffect(() => {
    if (!open) return;
    const initial = {
      name: editing?.name ?? "",
      frequency: editing?.frequency ?? ("monthly" as BillFrequency),
      dueMonth: editing?.dueMonth ?? 1,
      estimatedValue: editing?.estimatedValue ?? 0,
    };
    initialRef.current = initial;
    setName(initial.name);
    setFrequency(initial.frequency);
    setDueMonth(initial.dueMonth);
    setEstimatedValue(initial.estimatedValue);
    setError(null);
    setConfirmingClose(false);
  }, [open, editing]);

  const dirty =
    name !== initialRef.current.name ||
    frequency !== initialRef.current.frequency ||
    dueMonth !== initialRef.current.dueMonth ||
    estimatedValue !== initialRef.current.estimatedValue;

  function attemptClose() {
    if (dirty) {
      setConfirmingClose(true);
    } else {
      onClose();
    }
  }

  useEscapeClose(open, attemptClose);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || estimatedValue <= 0) {
      setError("Preencha nome e valor estimado corretamente.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), frequency, dueMonth: frequency === "yearly" ? dueMonth : undefined, estimatedValue });
      onClose();
    } catch {
      setError("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm" onClick={attemptClose}>
      <div className="w-full max-w-sm rounded-2xl border border-violet-400/20 bg-theme-surface p-7" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-theme-1">{editing ? "Editar conta" : "Nova conta"}</h3>
          <button onClick={attemptClose} className="text-theme-4 hover:text-theme-1">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Aluguel, Internet, IPVA"
              className="rounded-xl border border-theme-border bg-theme-bg px-3.5 py-3 text-sm text-theme-1 outline-none focus:border-violet-400"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFrequency("monthly")}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                frequency === "monthly"
                  ? "border-transparent bg-gradient-to-br from-violet-700 to-violet-400 text-theme-bg"
                  : "border-theme-border bg-theme-bg text-theme-3"
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setFrequency("yearly")}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                frequency === "yearly"
                  ? "border-transparent bg-gradient-to-br from-violet-700 to-violet-400 text-theme-bg"
                  : "border-theme-border bg-theme-bg text-theme-3"
              }`}
            >
              Anual
            </button>
          </div>

          {frequency === "yearly" && (
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Mês de vencimento</span>
              <select
                value={dueMonth}
                onChange={(e) => setDueMonth(Number(e.target.value))}
                className="rounded-xl border border-theme-border bg-theme-bg px-3.5 py-3 text-sm text-theme-1 outline-none focus:border-violet-400"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Valor estimado (R$)</span>
            <MoneyInput value={estimatedValue} onChange={setEstimatedValue} />
          </label>

          {error && <div className="text-sm text-rose-400">{error}</div>}
          <button
            type="submit"
            disabled={saving}
            className="mt-1.5 rounded-xl bg-gradient-to-br from-violet-700 to-violet-400 py-3 text-sm font-bold text-theme-bg disabled:opacity-60"
          >
            Salvar
          </button>
        </form>
      </div>

      <ConfirmModal
        open={confirmingClose}
        title="Sair sem salvar?"
        message="As alterações feitas serão perdidas."
        confirmLabel="Sair sem salvar"
        cancelLabel="Continuar editando"
        danger
        onConfirm={onClose}
        onCancel={() => setConfirmingClose(false)}
      />
    </div>
  );
}
