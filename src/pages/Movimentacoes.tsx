import { save } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { DeleteTransactionModal } from "../components/DeleteTransactionModal";
import { InstallmentGroupModal } from "../components/InstallmentGroupModal";
import { TagPicker } from "../components/TagPicker";
import { TransactionModal } from "../components/TransactionModal";
import { TransactionRow } from "../components/TransactionRow";
import { useToast } from "../context/ToastContext";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { api, TagWithUsage, Transaction, TransactionKind } from "../lib/api";
import { logger } from "../logger";
import { MONTH_NAMES } from "../strings";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function Movimentacoes() {
  const { profile } = useActiveProfile();
  const toast = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | "todos">(now.getMonth() + 1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [yearsWithData, setYearsWithData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ kind: TransactionKind; editing: Transaction | null } | null>(null);
  const [viewGroupId, setViewGroupId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagWithUsage[]>([]);
  const [filterTagIds, setFilterTagIds] = useState<number[]>([]);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  async function reload() {
    if (!profile) return;
    setLoading(true);
    try {
      const base = month === "todos" ? { userId: profile.id, year } : { userId: profile.id, year, month };
      const params = filterTagIds.length > 0 ? { ...base, tagIds: filterTagIds } : base;
      const [result, years, tags] = await Promise.all([
        api.transactions.list(params),
        api.transactions.yearsWithData(profile.id),
        api.tags.list(profile.id),
      ]);
      setTransactions(result);
      setYearsWithData(years);
      setAvailableTags(tags);
    } catch (err) {
      logger.error("falha ao listar movimentações", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, year, month, filterTagIds]);

  function toggleFilterTag(id: number) {
    setFilterTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
    await reload();
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

  async function handleExport() {
    if (!profile) return;
    const suffix = month === "todos" ? `${year}` : `${year}-${String(month).padStart(2, "0")}`;
    const path = await save({
      title: "Exportar movimentações",
      defaultPath: `movimentacoes-${suffix}.csv`,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (!path) return;
    setExporting(true);
    try {
      const params = month === "todos" ? { path, userId: profile.id, year } : { path, userId: profile.id, year, month };
      const count = await api.export.transactionsCsv(params);
      toast.show(`CSV exportado com ${count} lançamento${count === 1 ? "" : "s"}.`, "success");
    } catch (err) {
      logger.error("falha ao exportar CSV", err);
      toast.show("Não foi possível exportar o CSV.", "error");
    } finally {
      setExporting(false);
    }
  }

  const years = Array.from(new Set([...yearsWithData, now.getFullYear(), year])).sort((a, b) => a - b);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-theme-1">Movimentações</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-1"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value === "todos" ? "todos" : Number(e.target.value))}
            className="rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-1"
          >
            <option value="todos">Ano todo</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg border border-theme-border bg-theme-surface px-4 py-2 text-sm font-semibold text-theme-1 hover:border-violet-400 disabled:opacity-60"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => setModal({ kind: "in", editing: null })}
            className="rounded-lg border border-violet-400/35 bg-theme-surface px-4 py-2 text-sm font-semibold text-theme-1 hover:bg-gradient-to-br hover:from-violet-700 hover:to-violet-300 hover:text-theme-bg"
          >
            + Entrada
          </button>
          <button
            onClick={() => setModal({ kind: "out", editing: null })}
            className="rounded-lg border border-rose-400/35 bg-theme-surface px-4 py-2 text-sm font-semibold text-theme-1 hover:bg-gradient-to-br hover:from-rose-600 hover:to-rose-400 hover:text-theme-bg"
          >
            + Saída
          </button>
        </div>
      </header>

      {availableTags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Filtrar por tag:</span>
          <TagPicker tags={availableTags} selected={filterTagIds} onToggle={toggleFilterTag} />
          {filterTagIds.length > 0 && (
            <button onClick={() => setFilterTagIds([])} className="text-xs text-theme-4 underline hover:text-violet-300">
              limpar filtro
            </button>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-theme-border bg-theme-surface p-6">
        {loading && <div className="py-6 text-center text-sm text-theme-4">Carregando...</div>}
        {!loading && transactions.length === 0 && <div className="py-6 text-center text-sm text-theme-4">Nenhum lançamento no período.</div>}
        {!loading && (
          <div className="flex flex-col divide-y divide-theme-border">
            {transactions.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                onEdit={(tx) => setModal({ kind: tx.type, editing: tx })}
                onDelete={handleDelete}
                onViewGroup={(tx) => setViewGroupId(tx.installmentGroupId)}
              />
            ))}
          </div>
        )}
      </div>

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
