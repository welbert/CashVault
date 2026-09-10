import { useEscapeClose } from "../hooks/useEscapeClose";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * window.confirm() não funciona nesse WebView (retorna na hora, sem exibir
 * diálogo nenhum) — todo "tem certeza?" do app passa por aqui em vez disso.
 * z-[60] pra ficar acima de um modal de formulário que esteja aberto atrás
 * (ex: confirmar descarte ao fechar Nova entrada/saída).
 */
export function ConfirmModal({ open, title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar", danger = false, onConfirm, onCancel }: Props) {
  useEscapeClose(open, onCancel);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-theme-border bg-theme-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-theme-1">{title}</h3>
        <p className="mt-2 text-sm text-theme-3">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-theme-border bg-theme-bg px-4 py-2 text-sm font-semibold text-theme-3 hover:border-violet-400"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-bold text-theme-bg transition hover:brightness-110 ${
              danger ? "bg-gradient-to-br from-rose-600 to-rose-400" : "bg-gradient-to-br from-violet-700 to-violet-400"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
