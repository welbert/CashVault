import { Toast } from "../context/ToastContext";

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`w-max max-w-[340px] rounded-xl border px-4 py-3 text-sm shadow-xl ${
            t.type === "success" ? "border-emerald-600/40 bg-theme-raised text-theme-1" : "border-rose-600/40 bg-theme-raised text-theme-1"
          }`}
        >
          <span className={t.type === "success" ? "mr-1.5 text-emerald-400" : "mr-1.5 text-rose-400"}>{t.type === "success" ? "✓" : "✕"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
