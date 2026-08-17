import { invoke } from "@tauri-apps/api/core";
import { logger } from "../logger";

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (err) {
    logger.error(`invoke ${command} falhou`, err);
    throw err;
  }
}

export type UserSummary = {
  id: number;
  name: string;
  baseBalance: number;
  hasPassword: boolean;
};

export type TransactionKind = "in" | "out";

export type TagRef = {
  id: number;
  name: string;
};

export type TagWithUsage = {
  id: number;
  name: string;
  usageCount: number;
};

export type Transaction = {
  id: number;
  userId: number;
  type: TransactionKind;
  name: string;
  date: string;
  amount: number;
  installmentGroupId: number | null;
  installmentIndex: number | null;
  installmentCount: number | null;
  tags: TagRef[];
};

export type BillFrequency = "monthly" | "yearly";

export type BillStatus = {
  id: number;
  userId: number;
  name: string;
  frequency: BillFrequency;
  dueMonth: number | null;
  estimatedValue: number;
  paid: boolean;
  paidAmount: number | null;
  paidTransactionId: number | null;
};

export type TargetKind = "goal" | "purchase";

export type Target = {
  id: number;
  userId: number;
  kind: TargetKind;
  name: string;
  targetValue: number;
  currentSaldo: number;
  pct: number;
  remaining: number;
};

export type MonthSummary = {
  year: number;
  month: number;
  inTotal: number;
  outTotal: number;
  lucro: number;
  pctChange: number | null;
};

export type SaldoPoint = {
  month: number;
  saldo: number;
  pctChange: number | null;
};

export type DashboardData = {
  monthTotals: MonthSummary;
  monthHistory: MonthSummary[];
  saldoAtual: number;
  saldoHistory: SaldoPoint[];
  yearSeries: MonthSummary[];
  yearBalanceUpToMonth: number;
  yearsWithData: number[];
  monthsWithData: number[];
};

export type TransactionListParams = {
  userId: number;
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
  tagIds?: number[];
};

export const api = {
  users: {
    list: () => call<UserSummary[]>("list_users"),
    create: (name: string, baseBalance?: number) => call<number>("create_user", { name, baseBalance }),
    getActive: () => call<UserSummary | null>("get_active_profile"),
    switchActive: (userId: number) => call<void>("switch_active_profile", { userId }),
    rename: (userId: number, name: string) => call<void>("rename_user", { userId, name }),
    updateBaseBalance: (userId: number, baseBalance: number) =>
      call<void>("update_user_base_balance", { userId, baseBalance }),
    delete: (userId: number) => call<void>("delete_user", { userId }),
  },
  transactions: {
    list: (params: TransactionListParams) => call<Transaction[]>("list_transactions", params),
    create: (params: { userId: number; kind: TransactionKind; name: string; date: string; amount: number; tagIds?: number[] }) =>
      call<number>("create_transaction", params),
    createInstallmentPurchase: (params: {
      userId: number;
      name: string;
      firstDate: string;
      totalAmount: number;
      installmentCount: number;
      tagIds?: number[];
    }) => call<number[]>("create_installment_purchase", params),
    update: (params: { id: number; name: string; date: string; amount: number; tagIds?: number[] }) =>
      call<void>("update_transaction", params),
    delete: (id: number) => call<void>("delete_transaction", { id }),
    deleteInstallmentGroup: (groupId: number) => call<number>("delete_installment_group", { groupId }),
    renameInstallmentGroup: (groupId: number, name: string) =>
      call<void>("update_installment_group_name", { groupId, name }),
    listInstallmentGroup: (groupId: number) => call<Transaction[]>("list_installment_group", { groupId }),
    yearsWithData: (userId: number) => call<number[]>("get_years_with_data", { userId }),
    monthsWithData: (userId: number, year: number) => call<number[]>("get_months_with_data", { userId, year }),
  },
  targets: {
    list: (userId: number, kind?: TargetKind) => call<Target[]>("list_targets", { userId, kind }),
    create: (params: { userId: number; kind: TargetKind; name: string; targetValue: number }) =>
      call<number>("create_target", params),
    update: (params: { id: number; name: string; targetValue: number }) => call<void>("update_target", params),
    delete: (id: number) => call<void>("delete_target", { id }),
  },
  tags: {
    list: (userId: number) => call<TagWithUsage[]>("list_tags", { userId }),
    create: (userId: number, name: string) => call<number>("create_tag", { userId, name }),
    rename: (id: number, name: string) => call<void>("rename_tag", { id, name }),
    delete: (id: number) => call<void>("delete_tag", { id }),
  },
  bills: {
    list: (userId: number, year: number, month: number) => call<BillStatus[]>("list_bills", { userId, year, month }),
    create: (params: { userId: number; name: string; frequency: BillFrequency; dueMonth?: number; estimatedValue: number }) =>
      call<number>("create_bill", params),
    update: (params: { id: number; name: string; frequency: BillFrequency; dueMonth?: number; estimatedValue: number }) =>
      call<void>("update_bill", params),
    delete: (id: number) => call<void>("delete_bill", { id }),
    pay: (params: { userId: number; billId: number; year: number; month?: number; amount: number; date: string }) =>
      call<number>("pay_bill", params),
  },
  reports: {
    getDashboard: (userId: number, year: number, month: number) =>
      call<DashboardData>("get_dashboard", { userId, year, month }),
  },
  export: {
    transactionsCsv: (params: TransactionListParams & { path: string }) =>
      call<number>("export_transactions_csv", params),
  },
  logs: {
    open: () => call<void>("open_log_dir"),
  },
};
