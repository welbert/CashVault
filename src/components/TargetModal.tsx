import { FormEvent, useEffect, useRef, useState } from "react";
import { useEscapeClose } from "../hooks/useEscapeClose";
import { Target, TargetKind } from "../lib/api";
import { ConfirmModal } from "./ConfirmModal";
import { MoneyInput } from "./MoneyInput";

type Props = {
  open: boolean;
  kind: TargetKind;
  editing: Target | null;
  onClose: () => void;
  onSubmit: (data: { name: string; targetValue: number }) => Promise<void>;
};

export function TargetModal({ open, kind, editing, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [value, setValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const initialRef = useRef({ name: "", value: 0 });

  useEffect(() => {
    if (!open) return;
    const initial = { name: editing?.name ?? "", value: editing?.targetValue ?? 0 };
    initialRef.current = initial;
    setName(initial.name);
    setValue(initial.value);
    setError(null);
    setConfirmingClose(false);
  }, [open, editing]);

  const dirty = name !== initialRef.current.name || value !== initialRef.current.value;

  function attemptClose() {
    if (dirty) {
      setConfirmingClose(true);
    } else {
      onClose();
    }
  }

  useEscapeClose(open, attemptClose);

  if (!open) return null;

  const title = kind === "goal" ? (editing ? "Editar meta" : "Nova meta") : editing ? "Editar compra futura" : "Nova compra futura";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || value <= 0) {
      setError("Preencha nome e valor corretamente.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), targetValue: value });
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
          <h3 className="text-lg font-semibold text-theme-1">{title}</h3>
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
              placeholder={kind === "goal" ? "Ex: Apartamento" : "Ex: Notebook novo"}
              className="rounded-xl border border-theme-border bg-theme-bg px-3.5 py-3 text-sm text-theme-1 outline-none focus:border-violet-400"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Valor (R$)</span>
            <MoneyInput value={value} onChange={setValue} />
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
