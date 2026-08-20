import { useEscapeClose } from "../hooks/useEscapeClose";
import { Transaction } from "../lib/api";
import { ConfirmModal } from "./ConfirmModal";

type Props = {
  transaction: Transaction | null;
  onDeleteSingle: () => void;
  onDeleteGroup: () => void;
  onCancel: () => void;
};

/**
 * Confirmação de exclusão de lançamento, usada em Dashboard e Movimentações.
 * Se a movimentação faz parte de uma compra parcelada, oferece 3 opções em
 * vez do padrão Cancelar/Confirmar do ConfirmModal.
 */
export function DeleteTransactionModal({ transaction, onDeleteSingle, onDeleteGroup, onCancel }: Props) {
  const isInstallment = !!(transaction?.installmentGroupId && transaction.installmentCount && transaction.installmentCount > 1);

  useEscapeClose(!!transaction, onCancel);

  if (!isInstallment) {
    return (
      <ConfirmModal
        open={!!transaction}
        title="Remover lançamento"
        message={`Remover "${transaction?.name}"?`}
        confirmLabel="Remover"
        danger
        onConfirm={onDeleteSingle}
        onCancel={onCancel}
      />
    );
  }

  if (!transaction) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-theme-border bg-theme-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-theme-1">Remover lançamento</h3>
        <p className="mt-2 text-sm text-theme-3">
          "{transaction.name}" faz parte de uma compra parcelada de {transaction.installmentCount} parcelas. O que deseja remover?
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={onDeleteGroup} className="rounded-lg bg-gradient-to-br from-rose-600 to-rose-400 px-4 py-2 text-sm font-bold text-theme-bg">
            Todas as {transaction.installmentCount} parcelas
          </button>
          <button
            onClick={onDeleteSingle}
            className="rounded-lg border border-theme-border bg-theme-bg px-4 py-2 text-sm font-semibold text-theme-1 hover:border-violet-400"
          >
            Somente esta parcela
          </button>
          <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-theme-4 hover:text-theme-1">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
