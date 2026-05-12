import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import { Transaction } from '../db/schema';
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactions,
  getTransactionById,
  getPeriodStats,
  getCategoryStats,
} from '../db/queries';
import { checkAndAlertBudgets } from '../services/notificationService';
import { useSettingsStore } from './settingsStore';
import { useCategoryStore } from './categoryStore';

interface TransactionFilters {
  type?: 'income' | 'expense';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface TransactionStore {
  transactions: Transaction[];
  isLoaded: boolean;
  loadTransactions: (db: SQLite.SQLiteDatabase, filters?: TransactionFilters) => void;
  addTransaction: (db: SQLite.SQLiteDatabase, data: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  updateTransaction: (db: SQLite.SQLiteDatabase, id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (db: SQLite.SQLiteDatabase, id: string) => void;
  getPeriodStats: (db: SQLite.SQLiteDatabase, startDate: string, endDate: string) => { income: number; expense: number };
  getCategoryStats: (db: SQLite.SQLiteDatabase, startDate: string, endDate: string) => { categoryId: string; total: number }[];
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  isLoaded: false,

  loadTransactions: (db, filters) => {
    const txs = getTransactions(db, filters);
    set({ transactions: txs, isLoaded: true });
  },

  addTransaction: (db, data) => {
    const tx = addTransaction(db, data);
    get().loadTransactions(db);
    if (data.type === 'expense') {
      const { notifyBudget, budgetAlertThreshold } = useSettingsStore.getState();
      if (notifyBudget) {
        const monthKey = data.date.slice(0, 7);
        const { allCategories } = useCategoryStore.getState();
        checkAndAlertBudgets(db, monthKey, budgetAlertThreshold, allCategories).catch(() => {});
      }
    }
    return tx;
  },

  updateTransaction: (db, id, data) => {
    updateTransaction(db, id, data);
    get().loadTransactions(db);
    const { notifyBudget, budgetAlertThreshold } = useSettingsStore.getState();
    if (notifyBudget) {
      // data may be a partial patch — resolve missing type/date from the updated row
      const row = (!data.type || !data.date) ? getTransactionById(db, id) : null;
      const type = data.type ?? row?.type;
      const date = data.date ?? row?.date;
      if (type === 'expense' && date) {
        const monthKey = date.slice(0, 7);
        const { allCategories } = useCategoryStore.getState();
        checkAndAlertBudgets(db, monthKey, budgetAlertThreshold, allCategories).catch(() => {});
      }
    }
  },

  deleteTransaction: (db, id) => {
    deleteTransaction(db, id);
    get().loadTransactions(db);
  },

  getPeriodStats: (db, startDate, endDate) => {
    return getPeriodStats(db, startDate, endDate);
  },

  getCategoryStats: (db, startDate, endDate) => {
    return getCategoryStats(db, startDate, endDate, 'expense');
  },
}));
