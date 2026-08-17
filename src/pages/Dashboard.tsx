import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FlowChart } from "../components/charts/FlowChart";
import { GoalDonut } from "../components/charts/GoalDonut";
import { InstallmentGroupModal } from "../components/InstallmentGroupModal";
import { TransactionModal } from "../components/TransactionModal";
import { TransactionRow } from "../components/TransactionRow";
import { YearMonthBar } from "../components/YearMonthBar";
import { useToast } from "../context/ToastContext";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { useDashboard } from "../hooks/useDashboard";
import { api, BillStatus, Target, TagWithUsage, Transaction, TransactionKind } from "../lib/api";
import { fmt, fmtPct } from "../lib/format";
import { logger } from "../logger";
import { MONTH_NAMES } from "../strings";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function Dashboard() {
  const { profile } = useActiveProfile();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const year = Number(searchParams.get("ano")) || now.getFullYear();
  const month = Number(searchParams.get("mes")) || now.getMonth() + 1;

  const { data, loading, reload } = useDashboard(profile?.id, year, month);
  const [monthTxns, setMonthTxns] = useState<Transaction[]>([]);
  const [primaryGoal, setPrimaryGoal] = useState<Target | null>(null);
  const [modal, setModal] = useState<{ kind: TransactionKind; editing: Transaction | null } | null>(null);
  const [viewGroupId, setViewGroupId] = useState<number | null>(null);
  const [availableTags, setAvailableTags] = useState<TagWithUsage[]>([]);
  const [bills, setBills] = useState<BillStatus[]>([]);

  function changePeriod(y: number, m: number) {
    setSearchParams({ ano: String(y), mes: String(m) });
  }

  useEffect(() => {
    if (!profile) return;
    api.transactions
      .list({ userId: profile.id, year, month })
      .then(setMonthTxns)
      .catch((err) => logger.error("falha ao listar movimentações do mês", err));
  }, [profile, year, month, data]);

  useEffect(() => {
    if (!profile) return;
    api.tags.list(profile.id).then(setAvailableTags).catch((err) => logger.error("falha ao listar tags", err));
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    api.bills
      .list(profile.id, year, month)
      .then(setBills)
      .catch((err) => logger.error("falha ao listar contas", err));
  }, [profile, year, month, data]);

  useEffect(() => {
    if (!profile) return;
    api.targets
      .list(profile.id, "goal")
      .then((targets) => setPrimaryGoal(targets[0] ?? null))
      .catch((err) => logger.error("falha ao carregar meta", err));
  }, [profile, data]);

  if (!profile || loading || !data) {
    return <div className="text-theme-3">Carregando...</div>;
  }

  async function handleCreate(input: { name: string; date: string; amount: number; tagIds: number[] }) {
    if (!profile || !modal) return;
    await api.transactions.create({ userId: profile.id, kind: modal.kind, ...input });
    await reload();
  }

  async function handleCreateInstallments(input: {
    name: string;
    firstDate: string;
    totalAmount: number;
    installmentCount: number;
    tagIds: number[];
  }) {
    if (!profile) return;
    await api.transactions.createInstallmentPurchase({ userId: profile.id, ...input });
    await reload();
  }

  async function handleUpdate(input: { name: string; date: string; amount: number; tagIds: number[] }) {
    if (!modal?.editing) return;
    await api.transactions.update({ id: modal.editing.id, ...input });
    await reload();
  }

  async function handleRenameGroup(groupId: number, name: string) {
    await api.transactions.renameInstallmentGroup(groupId, name);
    await reload();
  }

  async function handleDelete(t: Transaction) {
    try {
      if (t.installmentGroupId && t.installmentCount && t.installmentCount > 1) {
        const whole = window.confirm(`"${t.name}" faz parte de uma compra parcelada. Remover todas as ${t.installmentCount} parcelas?`);
        if (whole) {
          await api.transactions.deleteInstallmentGroup(t.installmentGroupId);
        } else {
          await api.transactions.delete(t.id);
        }
      } else {
        await api.transactions.delete(t.id);
      }
      await reload();
    } catch (err) {
      logger.error("falha ao remover lançamento", err);
      toast.show("Não foi possível remover o lançamento.", "error");
    }
  }

  const missingForGoal = primaryGoal ? Math.max(0, -primaryGoal.remaining) : 0;
  const pendingBills = bills.filter((b) => !b.paid && (b.frequency === "monthly" || month >= (b.dueMonth ?? 1)));
  const previstas = pendingBills.reduce((sum, b) => sum + b.estimatedValue, 0);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-violet-300">Painel</div>
          <h1 className="text-3xl font-bold uppercase text-theme-1">
            {MONTH_NAMES[month - 1]} <span className="text-theme-3">— visão geral</span>
          </h1>
        </div>
        <span className="rounded-full bg-gradient-to-br from-violet-700 to-violet-400 px-5 py-2 font-mono text-lg font-extrabold text-theme-bg">
          {MONTH_NAMES[month - 1]}/{year}
        </span>
      </header>

      <YearMonthBar year={year} month={month} yearsWithData={data.yearsWithData} monthsWithData={data.monthsWithData} onChange={changePeriod} />

      {pendingBills.length > 0 && (
        <Link
          to="/contas"
          className="mb-4 flex items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3.5 text-sm text-amber-200 transition-colors hover:bg-amber-400/15"
        >
          <span>
            ⚠ {pendingBills.length} conta{pendingBills.length === 1 ? "" : "s"} pendente{pendingBills.length === 1 ? "" : "s"} —{" "}
            {pendingBills.map((b) => b.name).join(", ")}
          </span>
          <strong className="font-mono">{fmt(previstas)}</strong>
        </Link>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr_1fr]">
        <div className="grid grid-cols-2 gap-3.5">
          <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-[#2c1a52] via-[#170f28] to-[#100b1a] p-5">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wide text-theme-3">Lucro do mês</div>
            <div className="text-2xl font-bold text-violet-300">{fmt(data.monthTotals.lucro)}</div>
            <div className="mt-1 text-xs text-theme-4">recebido − despesas do mês</div>
            <div className="mt-3 flex max-h-40 flex-col gap-1 overflow-y-auto border-t border-theme-border pt-3">
              {data.monthHistory.length === 0 && <div className="text-xs text-theme-4">Nenhum mês anterior nesse ano</div>}
              {data.monthHistory.map((h) => (
                <div key={h.month} className="flex items-center justify-between py-1">
                  <span className="w-10 font-mono text-[11px] text-theme-4">{MONTH_NAMES[h.month - 1]}</span>
                  <span className="flex-1 font-mono text-xs font-semibold text-theme-1">{fmt(h.lucro)}</span>
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      h.pctChange == null ? "text-theme-4" : h.pctChange >= 0 ? "text-violet-300" : "text-rose-400"
                    }`}
                  >
                    {h.pctChange == null ? "—" : fmtPct(h.pctChange)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wide text-theme-3">Variação mensal</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {MONTH_NAMES.map((name, i) => {
                const m = i + 1;
                if (m > month) {
                  return (
                    <div key={m} className="min-w-[42px] flex-1 rounded-lg bg-theme-hover/40 py-2 text-center text-[9px] uppercase text-theme-4 opacity-30">
                      ···
                    </div>
                  );
                }
                const summary = m === month ? data.monthTotals : data.monthHistory.find((h) => h.month === m);
                const pct = summary?.pctChange ?? null;
                return (
                  <div
                    key={m}
                    className={`min-w-[42px] flex-1 rounded-lg py-2 text-center ${
                      m === month ? "border border-violet-400/50 bg-violet-400/10" : "bg-theme-hover/40"
                    }`}
                  >
                    <div className="font-mono text-[9px] uppercase text-theme-4">{name}</div>
                    <div className={`font-mono text-[11.5px] font-bold ${pct == null ? "text-theme-4" : pct >= 0 ? "text-violet-300" : "text-rose-400"}`}>
                      {pct == null ? "—" : fmtPct(pct)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-wide text-theme-3">Movimento do mês</div>
          <div className="flex items-center justify-between border-b border-theme-border py-2.5">
            <span className="text-sm text-violet-300">↘ recebido</span>
            <span className="font-mono text-base font-semibold text-violet-300">{fmt(data.monthTotals.inTotal)}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-rose-400">↗ despesas</span>
            <span className="font-mono text-base font-semibold text-rose-400">{fmt(data.monthTotals.outTotal)}</span>
          </div>
          {pendingBills.length > 0 && (
            <div className="flex items-center justify-between border-t border-theme-border py-2.5">
              <span className="text-sm text-amber-300">⏳ despesas previstas</span>
              <span className="font-mono text-base font-semibold text-amber-300">{fmt(previstas)}</span>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setModal({ kind: "in", editing: null })}
              className="flex-1 rounded-full border border-violet-400/35 bg-theme-bg py-2 text-xs font-semibold text-theme-1 hover:bg-gradient-to-br hover:from-violet-700 hover:to-violet-300 hover:text-theme-bg"
            >
              + Entrada
            </button>
            <button
              onClick={() => setModal({ kind: "out", editing: null })}
              className="flex-1 rounded-full border border-rose-400/35 bg-theme-bg py-2 text-xs font-semibold text-theme-1 hover:bg-gradient-to-br hover:from-rose-600 hover:to-rose-400 hover:text-theme-bg"
            >
              + Saída
            </button>
          </div>
          <div className="mt-4 max-h-40 overflow-y-auto border-t border-theme-border pt-3">
            {monthTxns.length === 0 && (
              <div className="py-2 text-center text-xs text-theme-4">Nenhum lançamento em {MONTH_NAMES[month - 1]} ainda</div>
            )}
            {monthTxns.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                onEdit={(tx) => setModal({ kind: tx.type, editing: tx })}
                onDelete={handleDelete}
                onViewGroup={(tx) => setViewGroupId(tx.installmentGroupId)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wide text-theme-3">Saldo em caixa</div>
          <div className="text-3xl font-bold text-theme-1">{fmt(data.saldoAtual)}</div>
          <div className="mt-1 text-xs text-theme-4">acumulado · ajustado pelo que entra e sai</div>
          <div className="mt-3 flex max-h-40 flex-col gap-1 overflow-y-auto border-t border-theme-border pt-3">
            {data.saldoHistory.length === 0 && <div className="text-xs text-theme-4">Nenhum mês anterior nesse ano</div>}
            {data.saldoHistory.map((h) => (
              <div key={h.month} className="flex items-center justify-between py-1">
                <span className="w-10 font-mono text-[11px] text-theme-4">{MONTH_NAMES[h.month - 1]}</span>
                <span className="flex-1 font-mono text-xs font-semibold text-theme-1">{fmt(h.saldo)}</span>
                <span
                  className={`font-mono text-[11px] font-bold ${
                    h.pctChange == null ? "text-theme-4" : h.pctChange >= 0 ? "text-violet-300" : "text-rose-400"
                  }`}
                >
                  {h.pctChange == null ? "—" : fmtPct(h.pctChange)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-2xl border border-theme-border bg-theme-surface p-6">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wide text-theme-3">Fluxo de caixa · ano {year}</span>
            <div className="flex gap-4 text-xs text-theme-3">
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-violet-300" />
                Entradas
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-rose-400" />
                Saídas
              </span>
            </div>
          </div>
          <FlowChart series={data.yearSeries} />
          <div className="mt-4 flex items-center justify-between border-t border-theme-border pt-4 text-sm text-theme-3">
            <span>Saldo do ano até o mês selecionado</span>
            <strong className="font-mono text-base text-violet-300">{fmt(data.yearBalanceUpToMonth)}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-theme-border bg-theme-surface p-5 text-center">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wide text-theme-3">Meta principal</div>
          {primaryGoal ? (
            <>
              <GoalDonut pct={primaryGoal.pct} />
              <div className="mt-3 text-xs text-theme-3">
                faltam para a meta
                <strong className="mt-1 block text-xl font-semibold text-amber-300">{fmt(missingForGoal)}</strong>
              </div>
              <div className="mt-4 flex justify-between border-t border-theme-border pt-3 text-xs text-theme-3">
                <span>{primaryGoal.name}</span>
                <strong className="text-theme-1">
                  {fmt(primaryGoal.currentSaldo)} de {fmt(primaryGoal.targetValue)}
                </strong>
              </div>
            </>
          ) : (
            <div className="py-6 text-sm text-theme-4">Nenhuma meta cadastrada ainda — crie uma em Metas &amp; Compras.</div>
          )}
        </div>
      </section>

      <TransactionModal
        open={!!modal}
        kind={modal?.kind ?? "in"}
        editing={modal?.editing ?? null}
        defaultDate={todayIso()}
        availableTags={availableTags}
        onClose={() => setModal(null)}
        onCreate={handleCreate}
        onCreateInstallments={handleCreateInstallments}
        onUpdate={handleUpdate}
        onRenameGroup={handleRenameGroup}
      />

      <InstallmentGroupModal
        groupId={viewGroupId}
        onClose={() => setViewGroupId(null)}
        onDeleteRow={async (id) => {
          await api.transactions.delete(id);
          await reload();
        }}
        onDeleteGroup={async (groupId) => {
          await api.transactions.deleteInstallmentGroup(groupId);
          await reload();
        }}
      />
    </div>
  );
}
