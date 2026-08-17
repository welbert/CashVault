import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoneyInput } from "../components/MoneyInput";
import { useToast } from "../context/ToastContext";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { api, UserSummary } from "../lib/api";
import { logger } from "../logger";
import { getTheme, setTheme, Theme } from "../theme";

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

  async function handleDeleteProfile(u: UserSummary) {
    const ok = window.confirm(`Excluir o perfil "${u.name}"? Todas as movimentações, metas e compras futuras dele serão apagadas para sempre.`);
    if (!ok) return;
    try {
      await api.users.delete(u.id);
      await refresh();
      await reloadUsers();
      toast.show(`Perfil "${u.name}" excluído.`, "success");
    } catch (err) {
      logger.error("falha ao excluir perfil", err);
      toast.show("Não foi possível excluir o perfil.", "error");
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
          <button type="submit" className="self-start rounded-xl bg-gradient-to-br from-violet-700 to-violet-400 px-6 py-2.5 text-sm font-bold text-theme-bg">
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
        <div className="flex gap-2">
          {(["system", "dark", "light"] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={`rounded-lg border px-4 py-2 text-sm capitalize ${
                theme === t ? "border-violet-400 bg-violet-400/10 text-theme-1" : "border-theme-border bg-theme-bg text-theme-3"
              }`}
            >
              {t === "system" ? "sistema" : t === "dark" ? "escuro" : "claro"}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-theme-border bg-theme-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-theme-1">Diagnóstico</h2>
        <button onClick={handleOpenLogs} className="rounded-lg border border-theme-border bg-theme-bg px-4 py-2.5 text-sm font-semibold text-theme-1 hover:border-violet-400">
          Abrir pasta de logs
        </button>
      </section>
    </div>
  );
}
