export type AccountTypeId =
  | 'bank'
  | 'credit_card'
  | 'cash'
  | 'loan'
  | 'investment'
  | 'other_balance';

export interface Account {
  id: string;
  name: string;
  type: AccountTypeId;
  balance: number;
  institution?: string;
  color?: string;
  createdAt: number;
}

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId?: string | null;
  category?: string | null;
  note?: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

export interface DataPayload {
  accounts: Account[];
  transactions: Transaction[];
}
