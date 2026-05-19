'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Wallet, CreditCard, Banknote, TrendingUp, TrendingDown, Plus,
  Home, ListPlus, BarChart3, Trash2, Edit3, X, ArrowUpRight,
  ArrowDownRight, ArrowLeftRight, Building2, PiggyBank, Receipt,
  Calendar, Loader2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import type { Account, Transaction, AccountTypeId, TransactionType } from '@/lib/types';

// ---------- Constants ----------
const ACCOUNT_TYPES: { id: AccountTypeId; label: string; icon: any; isAsset: boolean }[] = [
  { id: 'bank', label: 'Bank Account', icon: Building2, isAsset: true },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard, isAsset: false },
  { id: 'cash', label: 'Cash', icon: Banknote, isAsset: true },
  { id: 'loan', label: 'Loan', icon: Receipt, isAsset: false },
  { id: 'investment', label: 'Investment', icon: PiggyBank, isAsset: true },
  { id: 'other_balance', label: 'Other Balance', icon: Wallet, isAsset: true },
];

const EXPENSE_CATEGORIES = [
  'Food & Drinks', 'Groceries', 'Transport', 'Fuel', 'Shopping',
  'Bills & Utilities', 'Rent', 'Entertainment', 'Health', 'Education',
  'Travel', 'EMI Payment', 'Family', 'Personal Care', 'Other',
];

const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Investments', 'Refund', 'Gift', 'Other Income',
];

const CATEGORY_COLORS = [
  '#8B5A3C', '#2D6A4F', '#9D4842', '#3A5A78', '#C08552',
  '#52796F', '#A4243B', '#5C6E91', '#BC6C25', '#606C38',
  '#7D4F50', '#4A6741', '#996633', '#5F7A8B', '#736355',
];

// ---------- Utilities ----------
const formatINR = (amount: number) => {
  const num = Math.abs(amount);
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatCompact = (amount: number) => {
  const num = Math.abs(amount);
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
};

const todayISO = () => new Date().toISOString().split('T')[0];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const getAccountTypeMeta = (typeId: AccountTypeId) =>
  ACCOUNT_TYPES.find(t => t.id === typeId) || ACCOUNT_TYPES[0];

// ---------- API ----------
async function fetchData(): Promise<{ accounts: Account[]; transactions: Transaction[] }> {
  const res = await fetch('/api/data', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

async function saveData(accounts: Account[], transactions: Transaction[]): Promise<void> {
  const res = await fetch('/api/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accounts, transactions }),
  });
  if (!res.ok) throw new Error('Failed to save');
}

type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

// ---------- Main Component ----------
export default function FinanceTracker() {
  const [view, setView] = useState<'dashboard' | 'accounts' | 'transactions' | 'insights'>('dashboard');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);

  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load data on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchData();
        setAccounts(data.accounts || []);
        setTransactions(data.transactions || []);
      } catch (e) {
        console.error('Load failed', e);
        setSyncStatus('error');
      } finally {
        setLoading(false);
        hasLoadedRef.current = true;
      }
    })();
  }, []);

  // Debounced auto-save
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    setSyncStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveData(accounts, transactions);
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 1500);
      } catch (e) {
        console.error('Save failed', e);
        setSyncStatus('error');
      }
    }, 600);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [accounts, transactions]);

  // ---- Derived values ----
  const totals = useMemo(() => {
    let assets = 0, liabilities = 0;
    accounts.forEach(acc => {
      const meta = getAccountTypeMeta(acc.type);
      if (meta.isAsset) assets += Number(acc.balance) || 0;
      else liabilities += Number(acc.balance) || 0;
    });
    return { assets, liabilities, networth: assets - liabilities };
  }, [accounts]);

  const todaySpend = useMemo(() => {
    const t = todayISO();
    return transactions
      .filter(tx => tx.type === 'expense' && tx.date === t)
      .reduce((s, tx) => s + Number(tx.amount), 0);
  }, [transactions]);

  const monthSpend = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions
      .filter(tx => tx.type === 'expense' && tx.date.startsWith(ym))
      .reduce((s, tx) => s + Number(tx.amount), 0);
  }, [transactions]);

  const monthIncome = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions
      .filter(tx => tx.type === 'income' && tx.date.startsWith(ym))
      .reduce((s, tx) => s + Number(tx.amount), 0);
  }, [transactions]);

  // ---- Handlers ----
  const addOrUpdateAccount = useCallback((account: Account) => {
    setAccounts(prev => {
      const exists = prev.find(a => a.id === account.id);
      if (exists) return prev.map(a => a.id === account.id ? account : a);
      return [...prev, account];
    });
    setShowAccountModal(false);
    setEditingAccount(null);
  }, []);

  const deleteAccount = useCallback((id: string) => {
    if (!window.confirm('Delete this account? Transactions linked to it will remain but show as "Deleted Account".')) return;
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, []);

  const addOrUpdateTxn = useCallback((txn: Transaction) => {
    const oldTxn = editingTxn;
    setTransactions(prev => {
      const exists = prev.find(t => t.id === txn.id);
      if (exists) return prev.map(t => t.id === txn.id ? txn : t);
      return [txn, ...prev];
    });

    setAccounts(prev => {
      let updated = [...prev];

      // Reverse old txn
      if (oldTxn) {
        updated = updated.map(a => {
          if (oldTxn.type === 'expense' && a.id === oldTxn.accountId) {
            const meta = getAccountTypeMeta(a.type);
            return { ...a, balance: Number(a.balance) + (meta.isAsset ? Number(oldTxn.amount) : -Number(oldTxn.amount)) };
          }
          if (oldTxn.type === 'income' && a.id === oldTxn.accountId) {
            const meta = getAccountTypeMeta(a.type);
            return { ...a, balance: Number(a.balance) - (meta.isAsset ? Number(oldTxn.amount) : -Number(oldTxn.amount)) };
          }
          if (oldTxn.type === 'transfer') {
            if (a.id === oldTxn.accountId) return { ...a, balance: Number(a.balance) + Number(oldTxn.amount) };
            if (a.id === oldTxn.toAccountId) return { ...a, balance: Number(a.balance) - Number(oldTxn.amount) };
          }
          return a;
        });
      }

      // Apply new
      updated = updated.map(a => {
        if (txn.type === 'expense' && a.id === txn.accountId) {
          const meta = getAccountTypeMeta(a.type);
          return { ...a, balance: Number(a.balance) + (meta.isAsset ? -Number(txn.amount) : Number(txn.amount)) };
        }
        if (txn.type === 'income' && a.id === txn.accountId) {
          const meta = getAccountTypeMeta(a.type);
          return { ...a, balance: Number(a.balance) + (meta.isAsset ? Number(txn.amount) : -Number(txn.amount)) };
        }
        if (txn.type === 'transfer') {
          if (a.id === txn.accountId) return { ...a, balance: Number(a.balance) - Number(txn.amount) };
          if (a.id === txn.toAccountId) return { ...a, balance: Number(a.balance) + Number(txn.amount) };
        }
        return a;
      });

      return updated;
    });

    setShowTxnModal(false);
    setEditingTxn(null);
  }, [editingTxn]);

  const deleteTxn = useCallback((id: string) => {
    const txn = transactions.find(t => t.id === id);
    if (!txn) return;
    if (!window.confirm('Delete this transaction? Account balance will be adjusted.')) return;

    setAccounts(prev => prev.map(a => {
      if (txn.type === 'expense' && a.id === txn.accountId) {
        const meta = getAccountTypeMeta(a.type);
        return { ...a, balance: Number(a.balance) + (meta.isAsset ? Number(txn.amount) : -Number(txn.amount)) };
      }
      if (txn.type === 'income' && a.id === txn.accountId) {
        const meta = getAccountTypeMeta(a.type);
        return { ...a, balance: Number(a.balance) - (meta.isAsset ? Number(txn.amount) : -Number(txn.amount)) };
      }
      if (txn.type === 'transfer') {
        if (a.id === txn.accountId) return { ...a, balance: Number(a.balance) + Number(txn.amount) };
        if (a.id === txn.toAccountId) return { ...a, balance: Number(a.balance) - Number(txn.amount) };
      }
      return a;
    }));

    setTransactions(prev => prev.filter(t => t.id !== id));
  }, [transactions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--ink)' }} />
      </div>
    );
  }

  const syncLabel = {
    idle: '',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Sync error',
  }[syncStatus];

  return (
    <div className="pb-24" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Sync indicator */}
      <div className={`sync-indicator ${syncStatus !== 'idle' ? 'visible' : ''}`}>
        <span className={`sync-dot ${syncStatus}`} />
        {syncLabel}
      </div>

      {/* Header */}
      <header className="px-5 pt-8 pb-6">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--ink-mute)' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="ft-serif text-3xl font-semibold mt-1">Ledger</h1>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--ink-mute)' }}>Net Worth</p>
            <p
              className="ft-serif text-2xl font-semibold ft-mono"
              style={{ color: totals.networth >= 0 ? 'var(--accent)' : 'var(--danger)' }}
            >
              ₹{formatCompact(totals.networth)}
            </p>
          </div>
        </div>
      </header>

      <main className="px-5">
        {view === 'dashboard' && (
          <Dashboard
            totals={totals}
            todaySpend={todaySpend}
            monthSpend={monthSpend}
            monthIncome={monthIncome}
            accounts={accounts}
            transactions={transactions}
            onAddAccount={() => { setEditingAccount(null); setShowAccountModal(true); }}
            onEditTxn={(t) => { setEditingTxn(t); setShowTxnModal(true); }}
          />
        )}
        {view === 'accounts' && (
          <AccountsView
            accounts={accounts}
            onAdd={() => { setEditingAccount(null); setShowAccountModal(true); }}
            onEdit={(a) => { setEditingAccount(a); setShowAccountModal(true); }}
            onDelete={deleteAccount}
          />
        )}
        {view === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            accounts={accounts}
            onEdit={(t) => { setEditingTxn(t); setShowTxnModal(true); }}
            onDelete={deleteTxn}
          />
        )}
        {view === 'insights' && (
          <InsightsView transactions={transactions} />
        )}
      </main>

      <button
        className="ft-fab"
        onClick={() => {
          if (accounts.length === 0) {
            alert('Add at least one account first');
            setShowAccountModal(true);
            return;
          }
          setEditingTxn(null);
          setShowTxnModal(true);
        }}
        aria-label="Add transaction"
      >
        <Plus className="w-6 h-6" />
      </button>

      <nav
        className="fixed bottom-0 left-0 right-0 flex border-t"
        style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
      >
        {[
          { id: 'dashboard', label: 'Home', icon: Home },
          { id: 'accounts', label: 'Accounts', icon: Wallet },
          { id: 'transactions', label: 'History', icon: ListPlus },
          { id: 'insights', label: 'Insights', icon: BarChart3 },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`ft-tab ${view === t.id ? 'active' : ''}`}
              onClick={() => setView(t.id as any)}
            >
              <Icon className="w-5 h-5" strokeWidth={view === t.id ? 2.4 : 1.8} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {showAccountModal && (
        <AccountModal
          account={editingAccount}
          onSave={addOrUpdateAccount}
          onClose={() => { setShowAccountModal(false); setEditingAccount(null); }}
        />
      )}
      {showTxnModal && (
        <TransactionModal
          transaction={editingTxn}
          accounts={accounts}
          onSave={addOrUpdateTxn}
          onClose={() => { setShowTxnModal(false); setEditingTxn(null); }}
        />
      )}
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({
  totals, todaySpend, monthSpend, monthIncome, accounts, transactions, onAddAccount, onEditTxn,
}: any) {
  const recent = transactions.slice(0, 6);

  if (accounts.length === 0) {
    return (
      <div className="ft-card p-8 text-center mt-4">
        <Wallet className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ink-mute)' }} />
        <h2 className="ft-serif text-xl font-semibold mb-2">Start your ledger</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--ink-soft)' }}>
          Add your bank accounts, credit cards, cash, and any loans to begin tracking.
        </p>
        <button className="ft-btn-primary" onClick={onAddAccount}>
          <Plus className="w-4 h-4" /> Add first account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <SummaryTile label="Assets" value={totals.assets} icon={TrendingUp} color="var(--accent)" bg="var(--accent-soft)" />
        <SummaryTile label="Liabilities" value={totals.liabilities} icon={TrendingDown} color="var(--danger)" bg="var(--danger-soft)" />
        <SummaryTile label="Today's Spend" value={todaySpend} icon={Receipt} color="var(--warm)" bg="var(--warm-soft)" />
        <SummaryTile label="This Month" value={monthSpend} subValue={`+₹${formatCompact(monthIncome)} in`} icon={Calendar} color="var(--ink)" bg="var(--bg-soft)" />
      </div>

      <div className="ft-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="ft-serif text-lg font-semibold">Accounts</h3>
          <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{accounts.length} total</span>
        </div>
        <div className="space-y-2">
          {accounts.slice(0, 4).map((acc: Account) => (
            <AccountRow key={acc.id} account={acc} compact />
          ))}
        </div>
      </div>

      <div className="ft-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="ft-serif text-lg font-semibold">Recent activity</h3>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--ink-mute)' }}>
            No transactions yet. Add your first one with the + button.
          </p>
        ) : (
          <div className="space-y-1">
            {recent.map((tx: Transaction) => (
              <TransactionRow key={tx.id} txn={tx} accounts={accounts} onClick={() => onEditTxn(tx)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, subValue, icon: Icon, color, bg }: any) {
  return (
    <div className="ft-card p-4" style={{ background: bg }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--ink-soft)' }}>{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="ft-serif text-xl font-semibold ft-mono" style={{ color }}>
        ₹{formatCompact(value)}
      </p>
      {subValue && <p className="text-xs mt-1" style={{ color: 'var(--ink-mute)' }}>{subValue}</p>}
    </div>
  );
}

// ---------- Accounts View ----------
function AccountsView({ accounts, onAdd, onEdit, onDelete }: any) {
  const grouped = useMemo(() => {
    const g: Record<string, Account[]> = {};
    ACCOUNT_TYPES.forEach(t => { g[t.id] = []; });
    accounts.forEach((a: Account) => { if (g[a.type]) g[a.type].push(a); });
    return g;
  }, [accounts]);

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center justify-between">
        <h2 className="ft-serif text-xl font-semibold">All Accounts</h2>
        <button className="ft-btn-primary" onClick={onAdd}>
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {accounts.length === 0 && (
        <div className="ft-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            No accounts yet. Add bank accounts, credit cards, cash, loans, and investments.
          </p>
        </div>
      )}

      {ACCOUNT_TYPES.map(t => {
        const list = grouped[t.id];
        if (!list || list.length === 0) return null;
        const Icon = t.icon;
        return (
          <div key={t.id} className="ft-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4" style={{ color: 'var(--ink-soft)' }} />
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{t.label}</h3>
              <span className="text-xs ml-auto" style={{ color: 'var(--ink-mute)' }}>{list.length}</span>
            </div>
            <div className="space-y-2">
              {list.map(acc => (
                <AccountRow
                  key={acc.id}
                  account={acc}
                  onEdit={() => onEdit(acc)}
                  onDelete={() => onDelete(acc.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AccountRow({ account, onEdit, onDelete, compact }: { account: Account; onEdit?: () => void; onDelete?: () => void; compact?: boolean }) {
  const meta = getAccountTypeMeta(account.type);
  const Icon = meta.icon;

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: account.color || 'var(--bg-soft)', color: 'var(--card)' }}
        >
          <Icon className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{account.name}</p>
          {account.institution && (
            <p className="text-xs truncate" style={{ color: 'var(--ink-mute)' }}>{account.institution}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <p
          className="ft-mono text-sm font-semibold"
          style={{ color: meta.isAsset ? 'var(--ink)' : 'var(--danger)' }}
        >
          {meta.isAsset ? '' : '−'}₹{formatINR(account.balance)}
        </p>
        {!compact && (
          <div className="flex gap-1 ml-2">
            <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-white" style={{ color: 'var(--ink-soft)' }} aria-label="Edit">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-white" style={{ color: 'var(--danger)' }} aria-label="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Transactions View ----------
function TransactionsView({ transactions, accounts, onEdit, onDelete }: any) {
  const [filter, setFilter] = useState<'all' | TransactionType>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter((t: Transaction) => t.type === filter);
  }, [filter, transactions]);

  const grouped = useMemo(() => {
    const g: Record<string, Transaction[]> = {};
    filtered.forEach((t: Transaction) => {
      if (!g[t.date]) g[t.date] = [];
      g[t.date].push(t);
    });
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center justify-between">
        <h2 className="ft-serif text-xl font-semibold">Transactions</h2>
        <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{transactions.length} total</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All' },
          { id: 'expense', label: 'Expenses' },
          { id: 'income', label: 'Income' },
          { id: 'transfer', label: 'Transfers' },
        ].map(f => (
          <button
            key={f.id}
            className={`ft-chip ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id as any)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div className="ft-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>No transactions to show.</p>
        </div>
      ) : (
        grouped.map(([date, txns]) => {
          const dayTotal = txns
            .filter(t => t.type === 'expense')
            .reduce((s, t) => s + Number(t.amount), 0);
          return (
            <div key={date} className="ft-card p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--ink-soft)' }}>{formatDateHeader(date)}</h4>
                {dayTotal > 0 && (
                  <span className="text-xs ft-mono" style={{ color: 'var(--warm)' }}>Spent ₹{formatINR(dayTotal)}</span>
                )}
              </div>
              <div className="space-y-1">
                {txns.map(tx => (
                  <TransactionRow key={tx.id} txn={tx} accounts={accounts} onClick={() => onEdit(tx)} onDelete={() => onDelete(tx.id)} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yest.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function TransactionRow({ txn, accounts, onClick, onDelete }: { txn: Transaction; accounts: Account[]; onClick?: () => void; onDelete?: () => void }) {
  const account = accounts.find(a => a.id === txn.accountId);
  const toAccount = accounts.find(a => a.id === txn.toAccountId);

  const isExpense = txn.type === 'expense';
  const isIncome = txn.type === 'income';
  const isTransfer = txn.type === 'transfer';

  const ArrowIcon = isExpense ? ArrowDownRight : isIncome ? ArrowUpRight : ArrowLeftRight;
  const color = isExpense ? 'var(--danger)' : isIncome ? 'var(--accent)' : 'var(--ink-soft)';
  const bg = isExpense ? 'var(--danger-soft)' : isIncome ? 'var(--accent-soft)' : 'var(--bg-soft)';
  const sign = isExpense ? '−' : isIncome ? '+' : '';

  return (
    <div
      className="flex items-center gap-3 py-2 px-1 cursor-pointer rounded-lg hover:opacity-90"
      onClick={onClick}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg, color }}>
        <ArrowIcon className="w-4 h-4" strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{txn.note || txn.category || (isTransfer ? 'Transfer' : 'Transaction')}</p>
        <p className="text-xs truncate" style={{ color: 'var(--ink-mute)' }}>
          {isTransfer
            ? `${account?.name || 'Deleted'} → ${toAccount?.name || 'Deleted'}`
            : `${txn.category || 'Uncategorized'} · ${account?.name || 'Deleted account'}`}
        </p>
      </div>
      <div className="text-right">
        <p className="ft-mono text-sm font-semibold" style={{ color: isTransfer ? 'var(--ink)' : color }}>
          {sign}₹{formatINR(txn.amount)}
        </p>
        {onDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-xs" style={{ color: 'var(--ink-mute)' }}>
            <Trash2 className="w-3 h-3 inline mt-1" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Insights View ----------
function InsightsView({ transactions }: { transactions: Transaction[] }) {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthTxns = transactions.filter(t => t.date.startsWith(ym));

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'Other';
      map[cat] = (map[cat] || 0) + Number(t.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthTxns]);

  const totalMonth = byCategory.reduce((s, c) => s + c.value, 0);

  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const spent = transactions
        .filter(t => t.type === 'expense' && t.date === iso)
        .reduce((s, t) => s + Number(t.amount), 0);
      days.push({ day: d.toLocaleDateString('en-IN', { weekday: 'short' }), spent });
    }
    return days;
  }, [transactions]);

  return (
    <div className="space-y-4 mt-2">
      <h2 className="ft-serif text-xl font-semibold">Insights</h2>

      <div className="ft-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-soft)' }}>This Month</h3>
        <p className="ft-serif text-3xl font-semibold ft-mono mb-4">₹{formatINR(totalMonth)}</p>

        {byCategory.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--ink-mute)' }}>No expenses this month yet.</p>
        ) : (
          <>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                    {byCategory.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => `₹${formatINR(v)}`}
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-3">
              {byCategory.slice(0, 8).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="text-sm truncate">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm ft-mono font-semibold">₹{formatINR(c.value)}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--ink-mute)' }}>
                      {((c.value / totalMonth) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="ft-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-soft)' }}>Last 7 Days Spending</h3>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--ink-mute)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-mute)' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
              <Tooltip
                formatter={(v: any) => `₹${formatINR(v)}`}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="spent" fill="var(--warm)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ---------- Account Modal ----------
function AccountModal({ account, onSave, onClose }: { account: Account | null; onSave: (a: Account) => void; onClose: () => void }) {
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState<AccountTypeId>(account?.type || 'bank');
  const [balance, setBalance] = useState(account?.balance != null ? String(account.balance) : '');
  const [institution, setInstitution] = useState(account?.institution || '');
  const [color, setColor] = useState(account?.color || '#2D5F4C');

  const colors = ['#2D5F4C', '#8B5A3C', '#3A5A78', '#9D4842', '#5C6E91', '#52796F', '#BC6C25', '#736355'];

  const handleSave = () => {
    if (!name.trim()) return;
    const bal = parseFloat(balance) || 0;
    onSave({
      id: account?.id || uid(),
      name: name.trim(),
      type,
      balance: bal,
      institution: institution.trim(),
      color,
      createdAt: account?.createdAt || Date.now(),
    });
  };

  return (
    <div className="ft-modal-overlay" onClick={onClose}>
      <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="ft-serif text-xl font-semibold">{account ? 'Edit account' : 'New account'}</h3>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--ink-soft)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="ft-label">Account Type</label>
            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map(t => (
                <button
                  key={t.id}
                  className="ft-chip"
                  style={type === t.id ? { background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' } : {}}
                  onClick={() => setType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="ft-label">Name</label>
            <input
              className="ft-input"
              placeholder="HDFC Savings, SBI Card, Cash, ..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="ft-label">
              {getAccountTypeMeta(type).isAsset ? 'Current Balance (₹)' : 'Amount Owed (₹)'}
            </label>
            <input
              className="ft-input ft-mono"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>

          <div>
            <label className="ft-label">Institution (optional)</label>
            <input
              className="ft-input"
              placeholder="HDFC Bank, ICICI, ..."
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
          </div>

          <div>
            <label className="ft-label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map(c => (
                <button
                  key={c}
                  className="w-8 h-8 rounded-full border-2"
                  style={{ background: c, borderColor: color === c ? 'var(--ink)' : 'transparent' }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button className="ft-btn-ghost flex-1 justify-center" onClick={onClose}>Cancel</button>
            <button className="ft-btn-primary flex-1 justify-center" onClick={handleSave} disabled={!name.trim()}>
              Save account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Transaction Modal ----------
function TransactionModal({ transaction, accounts, onSave, onClose }: { transaction: Transaction | null; accounts: Account[]; onSave: (t: Transaction) => void; onClose: () => void }) {
  const [type, setType] = useState<TransactionType>(transaction?.type || 'expense');
  const [amount, setAmount] = useState(transaction?.amount != null ? String(transaction.amount) : '');
  const [accountId, setAccountId] = useState(transaction?.accountId || accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(transaction?.toAccountId || accounts[1]?.id || '');
  const [category, setCategory] = useState(transaction?.category || '');
  const [note, setNote] = useState(transaction?.note || '');
  const [date, setDate] = useState(transaction?.date || todayISO());

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    if (!accountId) return;
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) return;

    onSave({
      id: transaction?.id || uid(),
      type,
      amount: amt,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : null,
      category: type === 'transfer' ? null : (category || categories[0]),
      note: note.trim(),
      date,
      createdAt: transaction?.createdAt || Date.now(),
    });
  };

  return (
    <div className="ft-modal-overlay" onClick={onClose}>
      <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="ft-serif text-xl font-semibold">{transaction ? 'Edit transaction' : 'New transaction'}</h3>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--ink-soft)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl" style={{ background: 'var(--bg)' }}>
            {[
              { id: 'expense', label: 'Expense', color: 'var(--danger)' },
              { id: 'income', label: 'Income', color: 'var(--accent)' },
              { id: 'transfer', label: 'Transfer', color: 'var(--ink-soft)' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setType(t.id as TransactionType)}
                className="py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: type === t.id ? 'var(--card)' : 'transparent',
                  color: type === t.id ? t.color : 'var(--ink-mute)',
                  boxShadow: type === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label className="ft-label">Amount (₹)</label>
            <input
              className="ft-input ft-mono"
              style={{ fontSize: '20px', fontWeight: 600 }}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="ft-label">{type === 'transfer' ? 'From Account' : 'Account'}</label>
            <select className="ft-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} (₹{formatINR(a.balance)})</option>
              ))}
            </select>
          </div>

          {type === 'transfer' && (
            <div>
              <label className="ft-label">To Account</label>
              <select className="ft-select" value={toAccountId || ''} onChange={(e) => setToAccountId(e.target.value)}>
                <option value="">Select destination</option>
                {accounts.filter(a => a.id !== accountId).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {type !== 'transfer' && (
            <div>
              <label className="ft-label">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button key={c} className={`ft-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="ft-label">Note (optional)</label>
            <input className="ft-input" placeholder="What was this for?" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div>
            <label className="ft-label">Date</label>
            <input className="ft-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-2">
            <button className="ft-btn-ghost flex-1 justify-center" onClick={onClose}>Cancel</button>
            <button className="ft-btn-primary flex-1 justify-center" onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
