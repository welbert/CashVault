import { useMemo, useState } from "react";
import { GridLayout, useContainerWidth } from "react-grid-layout";
import type { Layout, LayoutItem } from "react-grid-layout";
import { gridBounds } from "react-grid-layout/core";
import { useDashboardLayout } from "../../hooks/useDashboardLayout";
import { AddCardDrawer } from "./AddCardDrawer";
import { CARD_CATALOG, CardKey, DashboardCardProps, GRID_COLS, SIZE_DIMENSIONS } from "./catalog";
import { allowedSizeConstraint, sizeFromDimensions } from "./gridConstraints";

const ROW_HEIGHT = 180;
const GRID_MARGIN: readonly [number, number] = [16, 16];

type Props = {
  userId: number;
  cardProps: DashboardCardProps;
};

export function DashboardGrid({ userId, cardProps }: Props) {
  const { items, loading, editMode, enterEditMode, confirmEdit, cancelEdit, updateLayout, addCard, removeCard } = useDashboardLayout(userId);
  const { width, containerRef, mounted } = useContainerWidth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visibleItems = items.filter((it) => it.visible);
  const hiddenKeys = (Object.keys(CARD_CATALOG) as CardKey[]).filter((key) => !visibleItems.some((it) => it.cardKey === key));

  const layout: LayoutItem[] = useMemo(
    () =>
      visibleItems.map((it) => {
        const dim = SIZE_DIMENSIONS[it.size];
        const catalogEntry = CARD_CATALOG[it.cardKey as CardKey] as (typeof CARD_CATALOG)[CardKey] | undefined;
        return {
          i: it.cardKey,
          x: it.x,
          y: it.y,
          w: dim.w,
          h: dim.h,
          constraints: catalogEntry ? [allowedSizeConstraint(catalogEntry.allowedSizes)] : undefined,
        };
      }),
    [visibleItems]
  );

  function handleLayoutChange(nextLayout: Layout) {
    updateLayout(nextLayout.map((it) => ({ cardKey: it.i, x: it.x, y: it.y, size: sizeFromDimensions(it.w, it.h) })));
  }

  if (loading) {
    return <div className="text-theme-3">Carregando dashboard...</div>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2">
        {editMode && (
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className="rounded-full border border-theme-border bg-theme-bg px-4 py-1.5 text-xs font-semibold text-theme-1 hover:border-violet-400/50"
          >
            + Adicionar card
          </button>
        )}
        {editMode && (
          <button
            onClick={cancelEdit}
            className="rounded-full border border-theme-border bg-theme-bg px-4 py-1.5 text-xs font-semibold text-theme-3 transition-colors hover:border-rose-400/50 hover:text-rose-400"
          >
            ✕ Cancelar
          </button>
        )}
        <button
          onClick={editMode ? confirmEdit : enterEditMode}
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
            editMode
              ? "border-violet-400 bg-violet-400/10 text-theme-1"
              : "border-theme-border bg-theme-bg text-theme-3 hover:border-violet-400/50 hover:text-theme-1"
          }`}
        >
          {editMode ? "✓ Concluir" : "✎ Personalizar"}
        </button>
      </div>

      {editMode && drawerOpen && (
        <AddCardDrawer
          hiddenKeys={hiddenKeys}
          onAdd={(key) => {
            addCard(key);
            setDrawerOpen(false);
          }}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/*
        `containerRef` é só pra medição (useContainerWidth) — precisa ficar em 100%
        da largura disponível pra medir certo, então o contorno NÃO pode ir nele
        (senão acompanha a tela inteira, não o grid). O contorno vai no wrapper de
        dentro, do tamanho real do grid (`width`), pra marcar exatamente onde a
        área editável termina — mesmo com espaço vazio sobrando à direita.
      */}
      <div ref={containerRef}>
        {mounted && (
          <div
            style={{ width }}
            className={editMode ? "rounded-2xl border-2 border-dashed border-violet-400/50 p-3" : undefined}
          >
            <GridLayout
              width={editMode ? width - 24 : width}
              layout={layout}
              gridConfig={{ cols: GRID_COLS, rowHeight: ROW_HEIGHT, margin: GRID_MARGIN, containerPadding: [0, 0] }}
              dragConfig={{ enabled: editMode }}
              resizeConfig={{ enabled: editMode, handles: ["se"] }}
              constraints={[gridBounds]}
              onLayoutChange={handleLayoutChange}
            >
              {visibleItems.map((it) => {
                const entry = CARD_CATALOG[it.cardKey as CardKey] as (typeof CARD_CATALOG)[CardKey] | undefined;
                if (!entry) return null;
                const Card = entry.component;
                return (
                  <div key={it.cardKey} className="group relative h-full">
                    <span
                      className="absolute right-2 top-2 z-10 flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-theme-border bg-theme-bg text-[10px] text-theme-4 hover:border-violet-400/50 hover:text-theme-1"
                      title={entry.description}
                    >
                      ?
                    </span>
                    {editMode && (
                      <button
                        onClick={() => removeCard(it.cardKey)}
                        className="absolute right-8 top-2 z-10 rounded-full border border-theme-border bg-theme-bg px-2 py-0.5 text-xs text-theme-3 opacity-0 transition-opacity hover:border-rose-400 hover:text-rose-400 group-hover:opacity-100"
                        title="Remover card"
                      >
                        ✕
                      </button>
                    )}
                    <Card {...cardProps} />
                  </div>
                );
              })}
            </GridLayout>
          </div>
        )}
      </div>
    </div>
  );
}
