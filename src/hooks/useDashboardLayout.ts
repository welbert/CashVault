import { useCallback, useEffect, useRef, useState } from "react";
import { CARD_CATALOG, CardKey, SIZE_DIMENSIONS } from "../components/dashboard-cards/catalog";
import { api, CardSize, DashboardLayoutItem } from "../lib/api";
import { logger } from "../logger";

const AUTOSAVE_DELAY_MS = 500;

export function useDashboardLayout(userId: number | undefined) {
  const [items, setItems] = useState<DashboardLayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // foto do layout ao entrar no modo de edição — permite "Cancelar" desfazer
  // tudo que foi autosalvo durante a sessão de edição, não só o estado visual.
  const snapshotRef = useRef<DashboardLayoutItem[] | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setItems(await api.dashboardLayout.get(userId));
    } catch (err) {
      logger.error("falha ao carregar layout do dashboard", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  function save(next: DashboardLayoutItem[]) {
    if (!userId) return;
    api.dashboardLayout.save(userId, next).catch((err) => logger.error("falha ao salvar layout do dashboard", err));
  }

  // autosave com debounce (decisão 12 do plano) — só faz sentido pro arrasto/resize
  // do react-grid-layout, que dispara onLayoutChange várias vezes por segundo durante
  // o gesto; salvar a cada disparo sobrecarregaria o banco à toa.
  function persistDebounced(next: DashboardLayoutItem[]) {
    setItems(next);
    if (!userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(next), AUTOSAVE_DELAY_MS);
  }

  // Ações discretas (um clique = uma mudança) salvam na hora — dar debounce aqui só
  // criaria uma janela onde fechar o app perde a mudança (bug real: remover um card
  // e fechar antes dos 500ms passarem fazia ele reaparecer no próximo start).
  function persistImmediate(next: DashboardLayoutItem[]) {
    setItems(next);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = undefined;
    }
    save(next);
  }

  /** Força salvar agora uma mudança de drag/resize ainda pendente no debounce — chamado ao sair do modo de edição. */
  function flush() {
    if (!saveTimer.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    save(items);
  }

  function updateLayout(positions: { cardKey: string; x: number; y: number; size: CardSize }[]) {
    const byKey = new Map(positions.map((p) => [p.cardKey, p]));
    persistDebounced(
      items.map((it) => {
        const pos = byKey.get(it.cardKey);
        return pos ? { ...it, x: pos.x, y: pos.y, size: pos.size } : it;
      })
    );
  }

  function addCard(cardKey: CardKey) {
    const visible = items.filter((it) => it.visible);
    const maxY = visible.reduce((max, it) => Math.max(max, it.y + SIZE_DIMENSIONS[it.size].h), 0);
    const defaultSize = CARD_CATALOG[cardKey].allowedSizes[0];
    const existing = items.find((it) => it.cardKey === cardKey);
    if (existing) {
      persistImmediate(items.map((it) => (it.cardKey === cardKey ? { ...it, visible: true } : it)));
    } else {
      persistImmediate([...items, { cardKey, x: 0, y: maxY, size: defaultSize, visible: true }]);
    }
  }

  function removeCard(cardKey: string) {
    persistImmediate(items.map((it) => (it.cardKey === cardKey ? { ...it, visible: false } : it)));
  }

  function enterEditMode() {
    snapshotRef.current = items;
    setEditMode(true);
  }

  /** Sai do modo de edição mantendo as mudanças — só garante que nada ficou preso no debounce. */
  function confirmEdit() {
    flush();
    snapshotRef.current = null;
    setEditMode(false);
  }

  /** Desfaz tudo que foi autosalvo durante a sessão de edição, restaurando e regravando o snapshot de quando entrou no modo. */
  function cancelEdit() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = undefined;
    }
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    setEditMode(false);
    if (!snapshot) return;
    setItems(snapshot);
    save(snapshot);
  }

  return { items, loading, editMode, enterEditMode, confirmEdit, cancelEdit, updateLayout, addCard, removeCard, reload };
}
