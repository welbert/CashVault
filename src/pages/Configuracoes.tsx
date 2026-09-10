import { open } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { MoneyInput } from "../components/MoneyInput";
import { useToast } from "../context/ToastContext";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { api, UserSummary } from "../lib/api";
import { logger } from "../logger";
import { getTheme, setTheme, Theme } from "../theme";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "dark", label: "Escuro" },
  { value: "violet-dark", label: "Violet Dark" },
  { value: "midnight-blue", label: "Midnight Blue" },
  { value: "light", label: "Claro" },
];

export function Configuracoes() {
  const { profile, switchProfile, refresh } = useActiveProfile();
  const toast = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [name, setName] = useState("");
  const [baseBalance, setBaseBalance] = useState(0);
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [newProfileName, setNewProfileName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserSummary | null>(null);
  const [backupFolder, setBackupFolder] = useState<string | null>(null);
  const [importPath, setImportPath] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setBaseBalance(profile.baseBalance);
    }
  }, [profile]);

  async function reloadUsers() {
    try {
      setUsers(await api.users.list());
    } catch (err) {
      logger.error("falha ao listar perfis", err);
    }
  }

  useEffect(() => {
    reloadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    api.backup.getFolder().then(setBackupFolder).catch((err) => logger.error("falha ao carregar pasta de backup", err));
  }, []);

  async function handleChooseBackupFolder() {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected || Array.isArray(selected)) return;
      await api.backup.setFolder(selected);
      setBackupFolder(selected);
      try {
        await api.backup.run();
        toast.show("Pasta de backup atualizada. Backup feito com sucesso.", "success");
      } catch {
        toast.show("Pasta de backup atualizada, mas o backup inicial falhou.", "error");
      }
    } catch (err) {
      logger.error("falha ao selecionar pasta de backup", err);
      toast.show("Não foi possível selecionar a pasta de backup.", "error");
    }
  }

  async function handleDisableBackup() {
    try {
      await api.backup.clearFolder();
      setBackupFolder(null);
      toast.show("Backup automático desativado.", "success");
    } catch (err) {
      logger.error("falha ao desativar backup", err);
      toast.show("Não foi possível desativar o backup.", "error");
    }
  }

  async function handleChooseImportFile() {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        filters: [{ name: "Banco de dados", extensions: ["db"] }],
      });
      if (!selected || Array.isArray(selected)) return;
      setImportPath(selected);
    } catch (err) {
      logger.error("falha ao selecionar arquivo de backup", err);
      toast.show("Não foi possível selecionar o arquivo.", "error");
    }
  }

  async function confirmImportBackup() {
    if (!importPath) return;
    setImporting(true);
    try {
      await api.backup.import(importPath);
      await relaunch();
    } catch (err) {
      toast.show("Não foi possível importar esse backup.", "error");
      setImporting(false);
      setImportPath(null);
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    try {
      await api.users.rename(profile.id, name.trim());
      await api.users.updateBaseBalance(profile.id, baseBalance);
      await refresh();
      await reloadUsers();
      setMessage("Perfil atualizado.");
    } catch (err) {
      logger.error("falha ao salvar perfil", err);
      setMessage("Não foi possível salvar.");
    }
  }

  async function handleCreateProfile(e: FormEvent) {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    try {
      await api.users.create(newProfileName.trim());
      await refresh();
      setNewProfileName("");
      navigate("/", { replace: true });
    } catch (err) {
      logger.error("falha ao criar perfil", err);
      toast.show("Não foi possível criar o perfil.", "error");
    }
  }

  function handleDeleteProfile(u: UserSummary) {
    setDeletingUser(u);
  }

  async function confirmDeleteProfile() {
    if (!deletingUser) return;
    try {
      await api.users.delete(deletingUser.id);
      await refresh();
      await reloadUsers();
      toast.show(`Perfil "${deletingUser.name}" excluído.`, "success");
    } catch (err) {
      logger.error("falha ao excluir perfil", err);
      toast.show("Não foi possível excluir o perfil.", "error");
    } finally {
      setDeletingUser(null);
    }
  }

  function handleThemeChange(value: Theme) {
    setTheme(value);
    setThemeState(value);
  }

  async function handleOpenLogs() {
    try {
      await api.logs.open();
    } catch (err) {
      logger.error("falha ao abrir pasta de logs", err);
      toast.show("Não foi possível abrir a pasta de logs.", "error");
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-theme-1">Configurações</h1>

      <section className="rounded-2xl border border-theme-border bg-theme-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-theme-1">Perfil atual</h2>
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-theme-border bg-theme-bg px-3.5 py-3 text-sm text-theme-1 outline-none focus:border-violet-400"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Saldo inicial em caixa (R$)</span>
            <MoneyInput value={baseBalance} onChange={setBaseBalance} />
          </label>
          {message && <div className="text-sm text-violet-300">{message}</div>}
          <button type="submit" className="self-start rounded-xl bg-gradient-to-br from-violet-700 to-violet-400 px-6 py-2.5 text-sm font-bold text-theme-bg transition hover:brightness-110">
            Salvar
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-theme-border bg-theme-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-theme-1">Trocar perfil</h2>
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <div
              key={u.id}
              className={`group flex items-center rounded-lg border px-4 py-2.5 text-sm ${
                u.id === profile?.id ? "border-violet-400 bg-violet-400/10 text-theme-1" : "border-theme-border bg-theme-bg text-theme-3"
              }`}
            >
              <button onClick={() => switchProfile(u.id)} className="flex-1 text-left hover:text-theme-1">
                {u.name}
              </button>
              <button
                onClick={() => handleDeleteProfile(u)}
                className="ml-2 text-theme-4 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                title="Excluir perfil"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={handleCreateProfile} className="mt-4 flex gap-2">
          <input
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="Nome do novo perfil"
            className="flex-1 rounded-xl border border-theme-border bg-theme-bg px-3.5 py-2.5 text-sm text-theme-1 outline-none focus:border-violet-400"
          />
          <button type="submit" className="rounded-xl border border-theme-border bg-theme-bg px-4 py-2.5 text-sm font-semibold text-theme-1 hover:border-violet-400">
            Criar perfil
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-theme-border bg-theme-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-theme-1">Aparência</h2>
        <div className="flex flex-wrap gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleThemeChange(opt.value)}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                theme === opt.value
                  ? "border-violet-400 bg-violet-400/10 text-theme-1"
                  : "border-theme-border bg-theme-bg text-theme-3 hover:border-violet-400 hover:text-theme-1"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-theme-border bg-theme-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-theme-1">Backup</h2>
        <p className="mb-3 text-sm text-theme-3">
          {backupFolder
            ? `Pasta atual: ${backupFolder}`
            : "Nenhuma pasta selecionada. O backup automático fica desativado até escolher uma."}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleChooseBackupFolder}
            className="rounded-lg border border-theme-border bg-theme-bg px-4 py-2.5 text-sm font-semibold text-theme-1 hover:border-violet-400"
          >
            {backupFolder ? "Alterar pasta" : "Selecionar pasta"}
          </button>
          {backupFolder && (
            <button
              onClick={handleDisableBackup}
              className="rounded-lg border border-theme-border bg-theme-bg px-4 py-2.5 text-sm font-semibold text-theme-1 hover:border-rose-400 hover:text-rose-400"
            >
              Desativar backup
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-theme-4">O banco de dados é copiado para essa pasta automaticamente toda vez que o app é aberto.</p>

        <div className="mt-5 border-t border-theme-border pt-5">
          <button
            onClick={handleChooseImportFile}
            className="rounded-lg border border-theme-border bg-theme-bg px-4 py-2.5 text-sm font-semibold text-theme-1 hover:border-violet-400"
          >
            Importar backup
          </button>
          <p className="mt-3 text-xs text-theme-4">
            Substitui todos os dados atuais pelos de um arquivo .db escolhido. O app reinicia sozinho depois de importar.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-theme-border bg-theme-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-theme-1">Diagnóstico</h2>
        <button onClick={handleOpenLogs} className="rounded-lg border border-theme-border bg-theme-bg px-4 py-2.5 text-sm font-semibold text-theme-1 hover:border-violet-400">
          Abrir pasta de logs
        </button>
      </section>

      <ConfirmModal
        open={!!deletingUser}
        title="Excluir perfil"
        message={`Excluir o perfil "${deletingUser?.name}"? Todas as movimentações, metas e compras futuras dele serão apagadas para sempre.`}
        confirmLabel="Excluir perfil"
        danger
        onConfirm={confirmDeleteProfile}
        onCancel={() => setDeletingUser(null)}
      />

      <ConfirmModal
        open={!!importPath}
        title="Importar backup"
        message={
          importing
            ? "Importando backup e reiniciando o app…"
            : "Isso vai substituir TODOS os perfis, movimentações, metas e contas atuais pelos dados desse arquivo. Essa ação não pode ser desfeita."
        }
        confirmLabel={importing ? "Importando…" : "Importar e reiniciar"}
        danger
        onConfirm={confirmImportBackup}
        onCancel={() => setImportPath(null)}
      />
    </div>
  );
}
