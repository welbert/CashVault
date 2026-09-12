import { ComponentType } from "react";
import { BillStatus, CardSize, DashboardData, Target, Transaction } from "../../lib/api";
import { CompraPrincipalCard } from "./CompraPrincipalCard";
import { EntradasPorTagCard } from "./EntradasPorTagCard";
import { FluxoDeCaixaCard } from "./FluxoDeCaixaCard";
import { LucroDoMesCard } from "./LucroDoMesCard";
import { MetaPrincipalCard } from "./MetaPrincipalCard";
import { MovimentoDoMesCard } from "./MovimentoDoMesCard";
import { ResumoDoMesCard } from "./ResumoDoMesCard";
import { SaidasPorTagCard } from "./SaidasPorTagCard";
import { SaldoEmCaixaCard } from "./SaldoEmCaixaCard";
import { VariacaoMensalCard } from "./VariacaoMensalCard";

export type CardKey =
  | "lucro_mes"
  | "variacao_mensal"
  | "saldo_caixa"
  | "resumo_mes"
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
  /** Explica o que o card mostra — usado no tooltip ("?" no card, hover na gaveta "Adicionar card"). */
  description: string;
  allowedSizes: CardSize[];
  component: ComponentType<DashboardCardProps>;
};

/**
 * Ordem também define a ordem de leitura na gaveta "Adicionar card".
 * `allowedSizes` reflete o formato real do conteúdo: cards estreitos-e-altos
 * (donut + legenda) usam a família "2xN", o gráfico de fluxo usa "6xN" (largura
 * cheia), e os cards compactos ficam em "2x1"/"4x1" (sem necessidade de altura).
 * O 1º item de cada lista é o tamanho usado ao adicionar o card pela gaveta.
 */
export const CARD_CATALOG: Record<CardKey, CardCatalogEntry> = {
  // "1x1"/"1x2" (1 coluna) somam-se ao antigo "2x1"/"2x2" pra permitir ficar mais estreito que 1/3 do dashboard.
  lucro_mes: {
    label: "Lucro do mês",
    description: "Lucro do mês selecionado (recebido − despesas) e comparação com os meses anteriores do ano.",
    allowedSizes: ["2x1", "1x1", "1x2", "2x2"],
    component: LucroDoMesCard,
  },
  variacao_mensal: {
    label: "Variação mensal",
    description: "Variação percentual do lucro mês a mês, ao longo do ano.",
    allowedSizes: ["2x1", "1x1", "1x2", "2x2", "4x1", "6x1"],
    component: VariacaoMensalCard,
  },
  saldo_caixa: {
    label: "Saldo em caixa",
    description: "Saldo acumulado atual do perfil e sua evolução nos meses anteriores do ano.",
    allowedSizes: ["2x1", "1x2", "2x2"],
    component: SaldoEmCaixaCard,
  },
  resumo_mes: {
    label: "Resumo do mês",
    description: "Recebido, despesas e despesas previstas do mês selecionado, com atalhos pra lançar entrada/saída.",
    allowedSizes: ["2x1", "1x1", "1x2", "2x2", "4x1"],
    component: ResumoDoMesCard,
  },
  // tem lista de lançamentos rolável — se beneficia de mais altura, não só largura.
  movimento_mes: {
    label: "Movimento do mês",
    description: "Lista de entradas e saídas lançadas no mês selecionado.",
    allowedSizes: ["2x1", "2x2", "2x3", "4x1", "4x2", "4x3"],
    component: MovimentoDoMesCard,
  },
  // donut de meta/compra é estreito — "4x2" (largura cheia) sobrava muito espaço vazio.
  meta_principal: {
    label: "Meta principal",
    description: "Progresso da meta principal em relação ao saldo acumulado do perfil.",
    allowedSizes: ["2x2"],
    component: MetaPrincipalCard,
  },
  compra_principal: {
    label: "Compra principal",
    description: "Progresso da compra futura principal em relação ao saldo acumulado do perfil.",
    allowedSizes: ["2x2"],
    component: CompraPrincipalCard,
  },
  fluxo_caixa: {
    label: "Fluxo de caixa",
    description: "Gráfico de entradas e saídas mês a mês, ao longo do ano.",
    allowedSizes: ["4x2", "6x2", "6x3"],
    component: FluxoDeCaixaCard,
  },
  // donut + legenda de tag: mesma lógica de meta/compra — estreito, não largo.
  entradas_por_tag: {
    label: "Entradas por tag",
    description: "Distribuição das entradas do mês selecionado, por tag.",
    allowedSizes: ["2x2", "1x2", "2x3", "1x3"],
    component: EntradasPorTagCard,
  },
  saidas_por_tag: {
    label: "Saídas por tag",
    description: "Distribuição das saídas do mês selecionado, por tag.",
    allowedSizes: ["2x2", "1x2", "2x3", "1x3"],
    component: SaidasPorTagCard,
  },
};

export const GRID_COLS = 6;

/** Largura (1º número, direto em colunas de GRID_COLS) x altura (2º número, em linhas de 180px) — gerado pra cobrir todo "WxH" de 1x1 a 6x3. */
export const SIZE_DIMENSIONS: Record<CardSize, { w: number; h: number }> = Object.fromEntries(
  Array.from({ length: GRID_COLS }, (_, i) => i + 1).flatMap((w) => [1, 2, 3].map((h) => [`${w}x${h}`, { w, h }]))
) as Record<CardSize, { w: number; h: number }>;
