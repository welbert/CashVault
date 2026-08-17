import { useCallback, useEffect, useState } from "react";
import { api, DashboardData } from "../lib/api";
import { logger } from "../logger";

export function useDashboard(userId: number | undefined, year: number, month: number) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await api.reports.getDashboard(userId, year, month);
      setData(result);
    } catch (err) {
      logger.error("falha ao carregar dashboard", err);
    } finally {
      setLoading(false);
    }
  }, [userId, year, month]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, reload };
}
