import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import { Budget, Transaction } from '../db/schema';
import {
  addBudget,
  updateBudget,
  deleteBudget,
  getBudgets,
} from '../db/queries';

interface BudgetStore {
  budgets: Budget[];
  isLoaded: boolean;
  loadBudgets: (db: SQLite.SQLiteDatabase, monthKey?: string | null) => void;
  addBudget: (db: SQLite.SQLiteDatabase, data: Omit<Budget, 'id'>) => Budget;
  updateBudget: (db: SQLite.SQLiteDatabase, id: string, limit: number) => void;
  deleteBudget: (db: SQLite.SQLiteDatabase, id: string) => void;
}

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  budgets: [],
  isLoaded: false,

  loadBudgets: (db, monthKey) => {
    const budgets = getBudgets(db, monthKey);
    set({ budgets, isLoaded: true });
  },

  addBudget: (db, data) => {
    const budget = addBudget(db, data);
    get().loadBudgets(db, data.month ?? null);
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
}));
