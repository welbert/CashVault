import { useEffect, useState } from "react";
import { TargetList } from "../components/TargetList";
import { TargetModal } from "../components/TargetModal";
import { useToast } from "../context/ToastContext";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { api, Target, TargetKind } from "../lib/api";
import { logger } from "../logger";

export function ComprasEMetas() {
  const { profile } = useActiveProfile();
  const toast = useToast();
  const [goals, setGoals] = useState<Target[]>([]);
  const [purchases, setPurchases] = useState<Target[]>([]);
  const [modal, setModal] = useState<{ kind: TargetKind; editing: Target | null } | null>(null);

  async function reload() {
    if (!profile) return;
    try {
      const [g, p] = await Promise.all([api.targets.list(profile.id, "goal"), api.targets.list(profile.id, "purchase")]);
      setGoals(g);
      setPurchases(p);
    } catch (err) {
      logger.error("falha ao carregar metas/compras", err);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function handleSubmit(data: { name: string; targetValue: number }) {
    if (!profile || !modal) return;
    if (modal.editing) {
      await api.targets.update({ id: modal.editing.id, ...data });
    } else {
      await api.targets.create({ userId: profile.id, kind: modal.kind, ...data });
    }
    await reload();
  }

  async function handleDelete(id: number) {
    try {
      await api.targets.delete(id);
      await reload();
    } catch (err) {
      logger.error("falha ao remover meta/compra", err);
      toast.show("Não foi possível remover.", "error");
    }
  }

  async function handleSetPrimary(id: number) {
    try {
      await api.targets.setPrimary(id);
      await reload();
    } catch (err) {
      logger.error("falha ao definir meta/compra principal", err);
      toast.show("Não foi possível definir como principal.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-theme-border bg-theme-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-theme-1">Metas de longo prazo</h2>
          <button
            onClick={() => setModal({ kind: "goal", editing: null })}
            className="rounded-full border border-theme-border bg-theme-bg px-4 py-2 text-xs font-semibold text-theme-1 hover:border-violet-400"
          >
            + adicionar
          </button>
        </div>
        <TargetList
          targets={goals}
          onEdit={(t) => setModal({ kind: "goal", editing: t })}
          onDelete={handleDelete}
          onSetPrimary={handleSetPrimary}
          emptyLabel="Nenhuma meta cadastrada ainda"
        />
      </section>

      <section className="rounded-2xl border border-theme-border bg-theme-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-theme-1">Compras futuras</h2>
          <button
            onClick={() => setModal({ kind: "purchase", editing: null })}
            className="rounded-full border border-theme-border bg-theme-bg px-4 py-2 text-xs font-semibold text-theme-1 hover:border-violet-400"
          >
            + adicionar
          </button>
        </div>
        <TargetList
          targets={purchases}
          onEdit={(t) => setModal({ kind: "purchase", editing: t })}
          onDelete={handleDelete}
          onSetPrimary={handleSetPrimary}
          emptyLabel="Nenhuma compra futura cadastrada"
        />
      </section>

      <TargetModal open={!!modal} kind={modal?.kind ?? "goal"} editing={modal?.editing ?? null} onClose={() => setModal(null)} onSubmit={handleSubmit} />
    </div>
  );
}
