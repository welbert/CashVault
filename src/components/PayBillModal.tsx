import { FormEvent, useEffect, useRef, useState } from "react";
import { useEscapeClose } from "../hooks/useEscapeClose";
import { BillStatus } from "../lib/api";
import { ConfirmModal } from "./ConfirmModal";
import { MoneyInput } from "./MoneyInput";

type Props = {
  bill: BillStatus | null;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (data: { amount: number; date: string }) => Promise<void>;
};

export function PayBillModal({ bill, defaultDate, onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(defaultDate);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const initialRef = useRef({ amount: 0, date: defaultDate });

  useEffect(() => {
    if (!bill) return;
    const initial = { amount: bill.estimatedValue, date: defaultDate };
    initialRef.current = initial;
    setAmount(initial.amount);
    setDate(initial.date);
    setError(null);
    setConfirmingClose(false);
  }, [bill, defaultDate]);

  const dirty = amount !== initialRef.current.amount || date !== initialRef.current.date;

  function attemptClose() {
    if (dirty) {
      setConfirmingClose(true);
    } else {
      onClose();
    }
  }

  useEscapeClose(!!bill, attemptClose);

  if (!bill) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ amount, date });
      onClose();
    } catch {
      setError("Não foi possível registrar o pagamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm" onClick={attemptClose}>
      <div className="w-full max-w-sm rounded-2xl border border-violet-400/20 bg-theme-surface p-7" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-theme-1">Marcar "{bill.name}" como paga</h3>
          <button onClick={attemptClose} className="text-theme-4 hover:text-theme-1">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Valor pago (R$)</span>
            <MoneyInput value={amount} onChange={setAmount} autoFocus />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Data</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-theme-border bg-theme-bg px-3.5 py-3 text-sm text-theme-1 outline-none focus:border-violet-400"
            />
          </label>
          {error && <div className="text-sm text-rose-400">{error}</div>}
          <button
            type="submit"
            disabled={saving}
            className="mt-1.5 rounded-xl bg-gradient-to-br from-violet-700 to-violet-400 py-3 text-sm font-bold text-theme-bg transition hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100"
          >
            Registrar pagamento
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
