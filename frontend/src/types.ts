// Mirror BE contract exactly — no extras.
// Spec: 2026-09-04-freelance-wallet-design.md §3-§4.

export type ProjectStatus = "Doing" | "Done" | "Paid";
export type TxType = "Income" | "Expense";

export interface Client {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  bankAccount?: string | null;
  note?: string | null;
}

export interface Project {
  id: string;
  clientId: string;
  title: string;
  price: number;
  status: ProjectStatus;
  deadline?: string | null;
  client?: Client | null;
}

export interface TransactionRecord {
  id: string;
  projectId?: string | null;
  accountId?: string | null;
  category?: string | null;
  type: TxType;
  amount: number;
  date: string;
  note?: string | null;
}

export interface OverdueItem {
  projectId: string;
  title: string;
  clientName: string;
  deadline?: string | null;
  price: number;
}

export interface DashboardResponse {
  income: number;
  expense: number;
  profit: number;
  overdue: OverdueItem[];
  doing: { id: string; title: string; clientName: string; deadline?: string | null; price: number }[];
  totalBalance: number;
  accounts: AccountBalance[];
  expenseByCategory: CategoryTotal[];
}

export interface AccountBalance {
  id: string;
  name: string;
  balance: number;
  openingBalance: number;
}

export interface BalancesResult {
  balances: AccountBalance[];
  total: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface ApiError {
  message: string;
}
