import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { api, UserSummary } from "../lib/api";
import { logger } from "../logger";

type ProfileContextValue = {
  profile: UserSummary | null;
  loading: boolean;
  refresh: () => Promise<UserSummary | null>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const active = await api.users.getActive();
      setProfile(active);
      return active;
    } catch (err) {
      logger.error("falha ao resolver perfil ativo", err);
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return <ProfileContext.Provider value={{ profile, loading, refresh }}>{children}</ProfileContext.Provider>;
}

export function useProfileContext() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfileContext deve ser usado dentro de ProfileProvider");
  return ctx;
}
