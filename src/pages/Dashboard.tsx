import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DashboardGrid } from "../components/dashboard-cards/DashboardGrid";
import { DeleteTransactionModal } from "../components/DeleteTransactionModal";
import { InstallmentGroupModal } from "../components/InstallmentGroupModal";
import { TransactionModal } from "../components/TransactionModal";
import { YearMonthBar } from "../components/YearMonthBar";
import { useToast } from "../context/ToastContext";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { useDashboard } from "../hooks/useDashboard";
import { api, BillStatus, Target, TagWithUsage, Transaction, TransactionKind } from "../lib/api";
import { fmt } from "../lib/format";
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
  const [primaryPurchase, setPrimaryPurchase] = useState<Target | null>(null);
  const [modal, setModal] = useState<{ kind: TransactionKind; editing: Transaction | null } | null>(null);
  const [viewGroupId, setViewGroupId] = useState<number | null>(null);
  const [availableTags, setAvailableTags] = useState<TagWithUsage[]>([]);
  const [bills, setBills] = useState<BillStatus[]>([]);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

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
    Promise.all([api.targets.list(profile.id, "goal"), api.targets.list(profile.id, "purchase")])
      .then(([goals, purchases]) => {
        // usa a marcada como principal em Metas & Compras; sem nenhuma marcada, cai pra primeira cadastrada.
        setPrimaryGoal(goals.find((g) => g.isPrimary) ?? goals[0] ?? null);
        setPrimaryPurchase(purchases.find((p) => p.isPrimary) ?? purchases[0] ?? null);
      })
      .catch((err) => logger.error("falha ao carregar metas/compras futuras", err));
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

  async function handleCreateTag(name: string): Promise<TagWithUsage> {
    if (!profile) throw new Error("Nenhum perfil ativo");
    const id = await api.tags.create(profile.id, name);
    const tags = await api.tags.list(profile.id);
    setAvailableTags(tags);
    return { id, name, usageCount: 0 };
  }

  function handleDelete(t: Transaction) {
    setDeletingTx(t);
  }

  async function deleteSingle() {
    if (!deletingTx) return;
    try {
      await api.transactions.delete(deletingTx.id);
      await reload();
    } catch (err) {
      logger.error("falha ao remover lançamento", err);
      toast.show("Não foi possível remover o lançamento.", "error");
    } finally {
      setDeletingTx(null);
    }
  }

  async function deleteWholeGroup() {
    if (!deletingTx?.installmentGroupId) return;
    try {
      await api.transactions.deleteInstallmentGroup(deletingTx.installmentGroupId);
      await reload();
    } catch (err) {
      logger.error("falha ao remover parcelas", err);
      toast.show("Não foi possível remover as parcelas.", "error");
    } finally {
      setDeletingTx(null);
    }
  }

  const missingForGoal = primaryGoal ? Math.max(0, -primaryGoal.remaining) : 0;
  const missingForPurchase = primaryPurchase ? Math.max(0, -primaryPurchase.remaining) : 0;
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
          className="mb-4 flex items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3.5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-400/15"
        >
          <span>
            ⚠ {pendingBills.length} conta{pendingBills.length === 1 ? "" : "s"} pendente{pendingBills.length === 1 ? "" : "s"} —{" "}
            {pendingBills.map((b) => b.name).join(", ")}
          </span>
          <strong className="font-mono">{fmt(previstas)}</strong>
        </Link>
      )}

      <DashboardGrid
        userId={profile.id}
        cardProps={{
          data,
          year,
          month,
          monthTxns,
          pendingBills,
          previstas,
          primaryGoal,
          primaryPurchase,
          missingForGoal,
          missingForPurchase,
          onNewIncome: () => setModal({ kind: "in", editing: null }),
          onNewExpense: () => setModal({ kind: "out", editing: null }),
          onEditTransaction: (tx) => setModal({ kind: tx.type, editing: tx }),
          onDeleteTransaction: handleDelete,
          onViewGroup: (tx) => setViewGroupId(tx.installmentGroupId),
        }}
      />

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
        onCreateTag={handleCreateTag}
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

      <DeleteTransactionModal
        transaction={deletingTx}
        onDeleteSingle={deleteSingle}
        onDeleteGroup={deleteWholeGroup}
        onCancel={() => setDeletingTx(null)}
      />
    </div>
  );
}
