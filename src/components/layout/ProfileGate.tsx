import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useProfileContext } from "../../context/ProfileContext";
import { api, UserSummary } from "../../lib/api";
import { logger } from "../../logger";

export function ProfileGate() {
  const { profile, loading, refresh } = useProfileContext();
  const [checkedUsers, setCheckedUsers] = useState(false);
  const [existingUsers, setExistingUsers] = useState<UserSummary[]>([]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading || profile) return;
    api.users
      .list()
      .then(setExistingUsers)
      .catch((err) => logger.error("falha ao listar perfis", err))
      .finally(() => setCheckedUsers(true));
  }, [loading, profile]);

  if (loading || (!profile && !checkedUsers)) {
    return <div className="flex h-screen items-center justify-center text-theme-3">Carregando...</div>;
  }

  if (!profile) {
    if (existingUsers.length === 0) {
      return <Navigate to="/perfil/novo" replace />;
    }
    return <InlineProfilePicker users={existingUsers} onPicked={refresh} />;
  }

  return <Outlet />;
}

function InlineProfilePicker({ users, onPicked }: { users: UserSummary[]; onPicked: () => void }) {
  async function pick(userId: number) {
    await api.users.switchActive(userId);
    onPicked();
  }

  return (
    <div className="flex h-screen items-center justify-center bg-theme-bg px-5">
      <div className="w-full max-w-sm rounded-2xl border border-theme-border bg-theme-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-theme-1">Selecione um perfil</h2>
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => pick(u.id)}
              className="rounded-lg border border-theme-border bg-theme-raised px-4 py-3 text-left text-theme-1 hover:border-violet-400"
            >
              {u.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
