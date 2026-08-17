import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoneyInput } from "../components/MoneyInput";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { api } from "../lib/api";
import { logger } from "../logger";

export function CreateProfile() {
  const [name, setName] = useState("");
  const [baseBalance, setBaseBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { refresh } = useActiveProfile();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Informe um nome para o perfil.");
      return;
    }
    setSaving(true);
    try {
      await api.users.create(name.trim(), baseBalance);
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      logger.error("falha ao criar perfil", err);
      setError("Não foi possível criar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-theme-bg px-5">
      <div className="w-full max-w-sm rounded-2xl border border-violet-400/20 bg-theme-surface p-8">
        <div className="mb-1 font-mono text-xs uppercase tracking-widest text-violet-300">Bem-vindo</div>
        <h1 className="mb-6 text-xl font-bold text-theme-1">Crie seu perfil</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              autoFocus
              className="rounded-xl border border-theme-border bg-theme-bg px-3.5 py-3 text-sm text-theme-1 outline-none focus:border-violet-400"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-theme-3">Saldo inicial em caixa (R$, opcional)</span>
            <MoneyInput value={baseBalance} onChange={setBaseBalance} />
          </label>
          {error && <div className="text-sm text-rose-400">{error}</div>}
          <button
            type="submit"
            disabled={saving}
            className="mt-1.5 rounded-xl bg-gradient-to-br from-violet-700 to-violet-400 py-3 text-sm font-bold text-theme-bg disabled:opacity-60"
          >
            Começar
          </button>
        </form>
      </div>
    </div>
  );
}
