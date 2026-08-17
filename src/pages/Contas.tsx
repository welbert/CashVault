import { useEffect, useState } from "react";
import { BillModal } from "../components/BillModal";
import { PayBillModal } from "../components/PayBillModal";
import { useToast } from "../context/ToastContext";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { api, BillFrequency, BillStatus } from "../lib/api";
import { fmt } from "../lib/format";
import { logger } from "../logger";
import { MONTH_NAMES } from "../strings";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function Contas() {
  const { profile } = useActiveProfile();
  const toast = useToast();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [bills, setBills] = useState<BillStatus[]>([]);
  const [modal, setModal] = useState<{ editing: BillStatus | null } | null>(null);
  const [payingBill, setPayingBill] = useState<BillStatus | null>(null);

  async function reload() {
    if (!profile) return;
    try {
      setBills(await api.bills.list(profile.id, year, month));
    } catch (err) {
      logger.error("falha ao listar contas", err);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function handleSubmit(data: { name: string; frequency: BillFrequency; dueMonth?: number; estimatedValue: number }) {
    if (!profile) return;
    if (modal?.editing) {
      await api.bills.update({ id: modal.editing.id, ...data });
    } else {
      await api.bills.create({ userId: profile.id, ...data });
    }
    await reload();
  }

  async function handleDelete(bill: BillStatus) {
    const ok = window.confirm(`Excluir a conta "${bill.name}"? As movimentações já registradas continuam existindo, só a conta em si é removida.`);
    if (!ok) return;
    try {
      await api.bills.delete(bill.id);
      await reload();
      toast.show(`Conta "${bill.name}" excluída.`, "success");
    } catch (err) {
      logger.error("falha ao excluir conta", err);
      toast.show("Não foi possível excluir a conta.", "error");
    }
  }

  async function handlePay(data: { amount: number; date: string }) {
    if (!profile || !payingBill) return;
    await api.bills.pay({
      userId: profile.id,
      billId: payingBill.id,
      year,
      month: payingBill.frequency === "monthly" ? month : undefined,
      amount: data.amount,
      date: data.date,
    });
    await reload();
    toast.show(`"${payingBill.name}" marcada como paga.`, "success");
  }

  async function handleUndoPay(bill: BillStatus) {
    if (!bill.paidTransactionId) return;
    const ok = window.confirm(`Desfazer o pagamento de "${bill.name}"? A movimentação registrada será removida.`);
    if (!ok) return;
    try {
      await api.transactions.delete(bill.paidTransactionId);
      await reload();
    } catch (err) {
      logger.error("falha ao desfazer pagamento", err);
      toast.show("Não foi possível desfazer o pagamento.", "error");
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-1">Contas</h1>
          <p className="mt-1 text-sm text-theme-3">
            Status de {MONTH_NAMES[month - 1]}/{year}
          </p>
        </div>
        <button
          onClick={() => setModal({ editing: null })}
          className="rounded-lg border border-violet-400/35 bg-theme-surface px-4 py-2 text-sm font-semibold text-theme-1 hover:bg-gradient-to-br hover:from-violet-700 hover:to-violet-300 hover:text-theme-bg"
        >
          + Nova conta
        </button>
      </header>

      <div className="rounded-2xl border border-theme-border bg-theme-surface p-6">
        {bills.length === 0 && <div className="py-6 text-center text-sm text-theme-4">Nenhuma conta cadastrada.</div>}
        <div className="flex flex-col divide-y divide-theme-border">
          {bills.map((bill) => (
            <div key={bill.id} className="group flex items-center gap-4 py-3.5">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-theme-1">{bill.name}</span>
                  <span className="rounded-full bg-theme-hover px-2 py-0.5 font-mono text-[10px] uppercase text-theme-4">
                    {bill.frequency === "monthly" ? "mensal" : `anual · vence ${MONTH_NAMES[(bill.dueMonth ?? 1) - 1]}`}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-xs text-theme-4">estimado {fmt(bill.estimatedValue)}</div>
              </div>

              {bill.paid ? (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                    pago · {fmt(bill.paidAmount ?? 0)}
                  </span>
                  <button onClick={() => handleUndoPay(bill)} className="text-xs text-theme-4 underline hover:text-rose-400">
                    desfazer
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setPayingBill(bill)}
                  className="rounded-full border border-emerald-500/40 bg-theme-bg px-4 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10"
                >
                  Pago
                </button>
              )}

              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => setModal({ editing: bill })} className="rounded p-1 text-theme-4 hover:text-violet-300" title="Editar">
                  ✎
                </button>
                <button onClick={() => handleDelete(bill)} className="rounded p-1 text-theme-4 hover:text-rose-400" title="Excluir">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BillModal open={!!modal} editing={modal?.editing ?? null} onClose={() => setModal(null)} onSubmit={handleSubmit} />
      <PayBillModal bill={payingBill} defaultDate={todayIso()} onClose={() => setPayingBill(null)} onSubmit={handlePay} />
    </div>
  );
}
