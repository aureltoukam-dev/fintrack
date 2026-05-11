import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import { Budget, Transaction } from '../db/schema';
import {
  addBudget,
  updateBudget,
  deleteBudget,
  getBudgets,
  getBudgetByCategoryId,
} from '../db/queries';

interface BudgetStore {
  budgets: Budget[];
  isLoaded: boolean;
  loadBudgets: (db: SQLite.SQLiteDatabase) => void;
  addBudget: (db: SQLite.SQLiteDatabase, data: Omit<Budget, 'id'>) => Budget;
  updateBudget: (db: SQLite.SQLiteDatabase, id: string, limit: number) => void;
  deleteBudget: (db: SQLite.SQLiteDatabase, id: string) => void;
  getBudgetProgress: (categoryId: string, transactions: Transaction[]) => {
    spent: number;
    limit: number;
    percent: number;
  };
}

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  budgets: [],
  isLoaded: false,

  loadBudgets: (db) => {
    const budgets = getBudgets(db);
    set({ budgets, isLoaded: true });
  },

  addBudget: (db, data) => {
    const budget = addBudget(db, data);
    get().loadBudgets(db);
    return budget;
  },

  updateBudget: (db, id, limit) => {
    updateBudget(db, id, limit);
    get().loadBudgets(db);
  },

  deleteBudget: (db, id) => {
    deleteBudget(db, id);
    get().loadBudgets(db);
  },

  getBudgetProgress: (categoryId, transactions) => {
    const { budgets } = get();
    const budget = budgets.find(b => b.categoryId === categoryId);
    if (!budget) return { spent: 0, limit: 0, percent: 0 };

    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const spent = transactions
      .filter(t =>
        t.categoryId === categoryId &&
        t.type === 'expense' &&
        t.date.startsWith(monthStr)
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const percent = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
    return { spent, limit: budget.limit, percent };
  },
}));
