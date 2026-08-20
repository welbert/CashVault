import { FormEvent, useEffect, useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { api, TagWithUsage } from "../lib/api";
import { logger } from "../logger";

export function TagsManager() {
  const { profile } = useActiveProfile();
  const toast = useToast();
  const [tags, setTags] = useState<TagWithUsage[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingTag, setDeletingTag] = useState<TagWithUsage | null>(null);

  async function reload() {
    if (!profile) return;
    try {
      setTags(await api.tags.list(profile.id));
    } catch (err) {
      logger.error("falha ao listar tags", err);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!profile || !newTagName.trim()) return;
    try {
      await api.tags.create(profile.id, newTagName.trim());
      setNewTagName("");
      await reload();
    } catch (err) {
      logger.error("falha ao criar tag", err);
      toast.show("Não foi possível criar a tag (nome já existe?).", "error");
    }
  }

  function startEditing(tag: TagWithUsage) {
    setEditingId(tag.id);
    setEditingName(tag.name);
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (editingId == null || !editingName.trim()) return;
    try {
      await api.tags.rename(editingId, editingName.trim());
      setEditingId(null);
      await reload();
    } catch (err) {
      logger.error("falha ao renomear tag", err);
      toast.show("Não foi possível renomear a tag (nome já existe?).", "error");
    }
  }

  function handleDelete(tag: TagWithUsage) {
    setDeletingTag(tag);
  }

  async function confirmDelete() {
    if (!deletingTag) return;
    try {
      await api.tags.delete(deletingTag.id);
      await reload();
      toast.show(`Tag "${deletingTag.name}" excluída.`, "success");
    } catch (err) {
      logger.error("falha ao excluir tag", err);
      toast.show("Não foi possível excluir a tag.", "error");
    } finally {
      setDeletingTag(null);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-theme-1">Tags</h1>

      <section className="rounded-2xl border border-theme-border bg-theme-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-theme-1">Suas tags</h2>
        <div className="flex flex-col divide-y divide-theme-border">
          {tags.length === 0 && <div className="py-3 text-center text-sm text-theme-4">Nenhuma tag cadastrada.</div>}
          {tags.map((tag) => (
            <div key={tag.id} className="group flex items-center gap-3 py-3">
              {editingId === tag.id ? (
                <form onSubmit={handleRename} className="flex flex-1 items-center gap-2">
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    className="flex-1 rounded-lg border border-theme-border bg-theme-bg px-3 py-1.5 text-sm text-theme-1 outline-none focus:border-violet-400"
                  />
                  <button type="submit" className="rounded-lg bg-gradient-to-br from-violet-700 to-violet-400 px-3 py-1.5 text-xs font-semibold text-theme-bg">
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-theme-border px-3 py-1.5 text-xs text-theme-3"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-theme-1">{tag.name}</span>
                  <span className="font-mono text-xs text-theme-4">
                    {tag.usageCount} movimentaç{tag.usageCount === 1 ? "ão" : "ões"}
                  </span>
                  <button
                    onClick={() => startEditing(tag)}
                    className="text-theme-4 opacity-0 transition-opacity hover:text-violet-300 group-hover:opacity-100"
                    title="Renomear"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDelete(tag)}
                    className="text-theme-4 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                    title="Excluir"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={handleCreate} className="mt-4 flex gap-2">
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Nome da nova tag"
            className="flex-1 rounded-xl border border-theme-border bg-theme-bg px-3.5 py-2.5 text-sm text-theme-1 outline-none focus:border-violet-400"
          />
          <button type="submit" className="rounded-xl border border-theme-border bg-theme-bg px-4 py-2.5 text-sm font-semibold text-theme-1 hover:border-violet-400">
            Criar tag
          </button>
        </form>
      </section>

      <ConfirmModal
        open={!!deletingTag}
        title="Excluir tag"
        message={
          deletingTag && deletingTag.usageCount > 0
            ? `A tag "${deletingTag.name}" está aplicada em ${deletingTag.usageCount} movimentaç${
                deletingTag.usageCount === 1 ? "ão" : "ões"
              }. Se excluir, ela${deletingTag.usageCount === 1 ? "" : "s"} ficará${
                deletingTag.usageCount === 1 ? "" : "ão"
              } sem essa tag. Continuar?`
            : `Excluir a tag "${deletingTag?.name}"?`
        }
        confirmLabel="Excluir"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeletingTag(null)}
      />
    </div>
  );
}
