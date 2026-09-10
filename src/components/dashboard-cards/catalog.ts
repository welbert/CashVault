import { ComponentType } from "react";
import { BillStatus, CardSize, DashboardData, Target, Transaction } from "../../lib/api";
import { CompraPrincipalCard } from "./CompraPrincipalCard";
import { EntradasPorTagCard } from "./EntradasPorTagCard";
import { FluxoDeCaixaCard } from "./FluxoDeCaixaCard";
import { LucroDoMesCard } from "./LucroDoMesCard";
import { MetaPrincipalCard } from "./MetaPrincipalCard";
import { MovimentoDoMesCard } from "./MovimentoDoMesCard";
import { SaidasPorTagCard } from "./SaidasPorTagCard";
import { SaldoEmCaixaCard } from "./SaldoEmCaixaCard";
import { VariacaoMensalCard } from "./VariacaoMensalCard";

export type CardKey =
  | "lucro_mes"
  | "variacao_mensal"
  | "saldo_caixa"
  | "movimento_mes"
  | "meta_principal"
  | "compra_principal"
  | "fluxo_caixa"
  | "entradas_por_tag"
  | "saidas_por_tag";

/** Contrato único passado a todo card — cada um usa só o recorte que precisa (decisão 11 do plano). */
export type DashboardCardProps = {
  data: DashboardData;
  year: number;
  month: number;
  monthTxns: Transaction[];
  pendingBills: BillStatus[];
  previstas: number;
  primaryGoal: Target | null;
  primaryPurchase: Target | null;
  missingForGoal: number;
  missingForPurchase: number;
  onNewIncome: () => void;
  onNewExpense: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onViewGroup: (tx: Transaction) => void;
};

export type CardCatalogEntry = {
  label: string;
  allowedSizes: CardSize[];
  component: ComponentType<DashboardCardProps>;
};

/**
 * Ordem também define a ordem de leitura na gaveta "Adicionar card".
 * `allowedSizes` reflete o formato real do conteúdo: cards estreitos-e-altos
 * (donut + legenda) usam a família "1xN", o gráfico de fluxo usa "3xN" (largura
 * cheia), e os cards compactos ficam em "1x1"/"2x1" (sem necessidade de altura).
 */
export const CARD_CATALOG: Record<CardKey, CardCatalogEntry> = {
  lucro_mes: { label: "Lucro do mês", allowedSizes: ["1x1", "1x2"], component: LucroDoMesCard },
  variacao_mensal: { label: "Variação mensal", allowedSizes: ["1x1", "2x1", "3x1"], component: VariacaoMensalCard },
  saldo_caixa: { label: "Saldo em caixa", allowedSizes: ["1x1", "1x2"], component: SaldoEmCaixaCard },
  // tem lista de lançamentos rolável — se beneficia de mais altura, não só largura.
  movimento_mes: { label: "Movimento do mês", allowedSizes: ["1x1", "1x2", "1x3", "2x1", "2x2", "2x3"], component: MovimentoDoMesCard },
  // donut de meta/compra é estreito — "2x2" (largura cheia) sobrava muito espaço vazio.
  meta_principal: { label: "Meta principal", allowedSizes: ["1x2"], component: MetaPrincipalCard },
  compra_principal: { label: "Compra principal", allowedSizes: ["1x2"], component: CompraPrincipalCard },
  fluxo_caixa: { label: "Fluxo de caixa", allowedSizes: ["2x2", "3x2", "3x3"], component: FluxoDeCaixaCard },
  // donut + legenda de tag: mesma lógica de meta/compra — estreito, não largo.
  entradas_por_tag: { label: "Entradas por tag", allowedSizes: ["1x2", "1x3"], component: EntradasPorTagCard },
  saidas_por_tag: { label: "Saídas por tag", allowedSizes: ["1x2", "1x3"], component: SaidasPorTagCard },
};

/** Largura em unidades de 2 colunas (1→2, 2→4, 3→6 de 6); altura em linhas de 180px. */
export const SIZE_DIMENSIONS: Record<CardSize, { w: number; h: number }> = {
  "1x1": { w: 2, h: 1 },
  "1x2": { w: 2, h: 2 },
  "1x3": { w: 2, h: 3 },
  "2x1": { w: 4, h: 1 },
  "2x2": { w: 4, h: 2 },
  "2x3": { w: 4, h: 3 },
  "3x1": { w: 6, h: 1 },
  "3x2": { w: 6, h: 2 },
  "3x3": { w: 6, h: 3 },
};

export const GRID_COLS = 6;
