import { useProfileContext } from "../context/ProfileContext";
import { api } from "../lib/api";

export function useActiveProfile() {
  const { profile, loading, refresh } = useProfileContext();

  async function switchProfile(userId: number) {
    await api.users.switchActive(userId);
    await refresh();
  }

  return { profile, loading, refresh, switchProfile };
}
