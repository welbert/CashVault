import { FormEvent, useEffect, useRef, useState } from "react";
import { useEscapeClose } from "../hooks/useEscapeClose";
import { TagWithUsage, Transaction, TransactionKind } from "../lib/api";
import { fmt } from "../lib/format";
import { ConfirmModal } from "./ConfirmModal";
import { MoneyInput } from "./MoneyInput";
import { TagAssignPicker } from "./TagAssignPicker";

type Props = {
  open: boolean;
  kind: TransactionKind;
  editing: Transaction | null;
  defaultDate: string;
  availableTags: TagWithUsage[];
  onClose: () => void;
  onCreate: (data: { name: string; date: string; amount: number; tagIds: number[] }) => Promise<void>;
  onCreateInstallments: (data: {
    name: string;
    firstDate: string;
    totalAmount: number;
    installmentCount: number;
    tagIds: number[];
  }) => Promise<void>;
  onUpdate: (data: { name: string; date: string; amount: number; tagIds: number[] }) => Promise<void>;
  onRenameGroup: (groupId: number, name: string) => Promise<void>;
  onCreateTag: (name: string) => Promise<TagWithUsage>;
};

export function TransactionModal({
  open,
  kind,
  editing,
  defaultDate,
  availableTags,
  onClose,
  onCreate,
  onCreateInstallments,
  onUpdate,
  onRenameGroup,
  onCreateTag,
}: Props) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [amount, setAmount] = useState(0);
  const [payType, setPayType] = useState<"avista" | "parcelado">("avista");
  const [installments, setInstallments] = useState("2");
  const [renameWholeGroup, setRenameWholeGroup] = useState(true);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const isEditingInstallment = !!editing?.installmentCount;

  const initialRef = useRef({ name: "", date: defaultDate, amount: 0, payType: "avista" as "avista" | "parcelado", installments: "2", tagIds: [] as number[] });

  useEffect(() => {
    if (!open) return;
    const initial = {
      name: editing?.name ?? "",
      date: editing?.date ?? defaultDate,
      amount: editing?.amount ?? 0,
      payType: (editing?.installmentCount ? "parcelado" : "avista") as "avista" | "parcelado",
      installments: editing?.installmentCount ? String(editing.installmentCount) : "2",
      tagIds: editing?.tags.map((t) => t.id) ?? [],
    };
    initialRef.current = initial;
    setName(initial.name);
    setDate(initial.date);
    setAmount(initial.amount);
    setPayType(initial.payType);
    setInstallments(initial.installments);
    setRenameWholeGroup(true);
    setTagIds(initial.tagIds);
    setError(null);
    setConfirmingClose(false);
  }, [open, editing, defaultDate]);

  function toggleTag(id: number) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const dirty =
    name !== initialRef.current.name ||
    date !== initialRef.current.date ||
    amount !== initialRef.current.amount ||
    payType !== initialRef.current.payType ||
    installments !== initialRef.current.installments ||
    tagIds.length !== initialRef.current.tagIds.length ||
    tagIds.some((id) => !initialRef.current.tagIds.includes(id));

  function attemptClose() {
    if (dirty) {
      setConfirmingClose(true);
    } else {
      onClose();
    }
  }

  useEscapeClose(open, attemptClose);

  if (!open) return null;

  const isExpense = kind === "out";
  const title = editing ? `Editar ${isExpense ? "saída" : "entrada"}` : `Nova ${isExpense ? "saída" : "entrada"}`;
  const installmentCountValue = parseInt(installments, 10);
  const perInstallment = payType === "parcelado" && amount > 0 && installmentCountValue > 0 ? amount / installmentCountValue : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !date || amount <= 0) {
      setError("Preencha nome, data e valor corretamente.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await onUpdate({ name: name.trim(), date, amount, tagIds });
        if (isEditingInstallment && renameWholeGroup && editing.installmentGroupId) {
          await onRenameGroup(editing.installmentGroupId, name.trim());
        }
      } else if (isExpense && payType === "parcelado") {
        if (installmentCountValue < 2) {
          setError("Número de parcelas deve ser 2 ou mais.");
          setSaving(false);
          return;
        }
        await onCreateInstallments({
          name: name.trim(),
          firstDate: date,
          totalAmount: amount,
          installmentCount: installmentCountValue,
          tagIds,
        });
      } else {
        await onCreate({ name: name.trim(), date, amount, tagIds });
      }
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
              placeholder="Ex: Consultoria — Cliente A"
              className="rounded-xl border border-theme-border bg-theme-bg px-3.5 py-3 text-sm text-theme-1 outline-none focus:border-violet-400"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Data {isEditingInstallment ? "(desta parcela)" : ""}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-theme-border bg-theme-bg px-3.5 py-3 text-sm text-theme-1 outline-none focus:border-violet-400"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-theme-3">
              Valor (R$) {isEditingInstallment ? "(desta parcela)" : ""}
            </span>
            <MoneyInput value={amount} onChange={setAmount} />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Tags</span>
            <TagAssignPicker tags={availableTags} selected={tagIds} onToggle={toggleTag} onCreate={onCreateTag} />
          </div>

          {isEditingInstallment && (
            <label className="flex items-center gap-2 text-xs text-theme-3">
              <input
                type="checkbox"
                checked={renameWholeGroup}
                onChange={(e) => setRenameWholeGroup(e.target.checked)}
                className="h-3.5 w-3.5 accent-violet-500"
              />
              Aplicar este nome a todas as {editing?.installmentCount} parcelas desta compra
            </label>
          )}

          {isExpense && !editing && (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayType("avista")}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                    payType === "avista"
                      ? "border-transparent bg-gradient-to-br from-violet-700 to-violet-400 text-theme-bg"
                      : "border-theme-border bg-theme-bg text-theme-3 hover:border-violet-400/50"
                  }`}
                >
                  À vista
                </button>
                <button
                  type="button"
                  onClick={() => setPayType("parcelado")}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                    payType === "parcelado"
                      ? "border-transparent bg-gradient-to-br from-violet-700 to-violet-400 text-theme-bg"
                      : "border-theme-border bg-theme-bg text-theme-3 hover:border-violet-400/50"
                  }`}
                >
                  Parcelado
                </button>
              </div>
              {payType === "parcelado" && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Número de parcelas</span>
                    <input
                      type="number"
                      min="2"
                      step="1"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      placeholder="Ex: 12"
                      className="rounded-xl border border-theme-border bg-theme-bg px-3.5 py-3 text-sm text-theme-1 outline-none focus:border-violet-400"
                    />
                  </label>
                  <div className="rounded-xl border border-theme-border bg-theme-bg px-3.5 py-3 font-mono text-xs text-theme-3">
                    Valor de cada parcela: <strong className="text-violet-300">{fmt(perInstallment)}</strong>
                    <div className="mt-1 text-theme-4">Gera {installmentCountValue || 0} lançamentos, um por mês.</div>
                  </div>
                </>
              )}
            </>
          )}

          {error && <div className="text-sm text-rose-400">{error}</div>}
          <button
            type="submit"
            disabled={saving}
            className={`mt-1.5 rounded-xl py-3 text-sm font-bold text-theme-bg transition hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100 ${
              isExpense ? "bg-gradient-to-br from-rose-600 to-rose-400" : "bg-gradient-to-br from-violet-700 to-violet-400"
            }`}
          >
            {editing ? "Salvar alterações" : isExpense ? "Registrar saída" : "Registrar entrada"}
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
