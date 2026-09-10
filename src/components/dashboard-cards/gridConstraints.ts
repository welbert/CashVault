import type { LayoutConstraint } from "react-grid-layout/core";
import { CardSize } from "../../lib/api";
import { SIZE_DIMENSIONS } from "./catalog";

/** Distância entre dois tamanhos em unidades de grid — usada pra achar o mais próximo. */
function dimensionDistance(a: { w: number; h: number }, b: { w: number; h: number }): number {
  return Math.abs(a.w - b.w) + Math.abs(a.h - b.h);
}

/**
 * Resize sempre snapado num dos tamanhos permitidos do card (decisão 10 do
 * plano) — nunca resize livre por pixel/coluna. A cada proposta de w/h durante
 * o arrasto, escolhe o tamanho permitido mais próximo.
 */
export function allowedSizeConstraint(allowedSizes: CardSize[]): LayoutConstraint {
  const candidates = allowedSizes.map((size) => SIZE_DIMENSIONS[size]);
  return {
    name: "allowed-size",
    constrainSize(_item: unknown, w: number, h: number) {
      let best = candidates[0];
      let bestDist = Infinity;
      for (const candidate of candidates) {
        const dist = dimensionDistance(candidate, { w, h });
        if (dist < bestDist) {
          bestDist = dist;
          best = candidate;
        }
      }
      return best;
    },
  };
}

/** Inverso de `SIZE_DIMENSIONS` — depois do snap, w/h devem bater exatamente com um tamanho; fallback defensivo pro mais próximo. */
export function sizeFromDimensions(w: number, h: number): CardSize {
  let best: CardSize = "1x1";
  let bestDist = Infinity;
  for (const [size, dim] of Object.entries(SIZE_DIMENSIONS) as [CardSize, { w: number; h: number }][]) {
    const dist = dimensionDistance(dim, { w, h });
    if (dist < bestDist) {
      bestDist = dist;
      best = size;
    }
  }
  return best;
}
