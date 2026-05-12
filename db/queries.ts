import * as SQLite from 'expo-sqlite';
import 'react-native-get-random-values'; // Required for uuid
import { v4 as uuidv4 } from 'uuid';
import { Transaction, Category, Budget, Settings } from './schema';

// --- Helper Functions ---
const getCurrentISODate = (): string => new Date().toISOString();

// --- Transactions ---
export const addTransaction = (
  db: SQLite.SQLiteDatabase,
  tx: Omit<Transaction, 'id' | 'createdAt'>
): Transaction => {
  const id = uuidv4();
  const createdAt = getCurrentISODate();
  const { date, amount, type, categoryId, note } = tx;

  db.runSync(
    'INSERT INTO transactions (id, date, amount, type, categoryId, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, date, amount, type, categoryId, note ?? null, createdAt]
  );

  return { id, date, amount, type, categoryId, note, createdAt };
};

export const updateTransaction = (
  db: SQLite.SQLiteDatabase,
  id: string,
  data: Partial<Transaction>
): void => {
  const updates: string[] = [];
  const params: any[] = [];

  if (data.date !== undefined) {
    updates.push('date = ?');
    params.push(data.date);
  }
  if (data.amount !== undefined) {
    updates.push('amount = ?');
    params.push(data.amount);
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    params.push(data.type);
  }
  if (data.categoryId !== undefined) {
    updates.push('categoryId = ?');
    params.push(data.categoryId);
  }
  if (data.note !== undefined) {
    updates.push('note = ?');
    params.push(data.note);
  }

  const updatedAt = getCurrentISODate();
  updates.push('updatedAt = ?');
  params.push(updatedAt);

  params.push(id);

  db.runSync(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`, params);
};

export const deleteTransaction = (db: SQLite.SQLiteDatabase, id: string): void => {
  db.runSync('DELETE FROM transactions WHERE id = ?', [id]);
};

export const getTransactions = (
  db: SQLite.SQLiteDatabase,
  filters?: {
    type?: 'income' | 'expense';
    categoryId?: string;
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    search?: string; // for note
  }
): Transaction[] => {
  let sql = `
    SELECT id, date, amount, type, categoryId, note, createdAt, updatedAt
    FROM transactions
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.type) {
    sql += ' AND type = ?';
    params.push(filters.type);
  }
  if (filters?.categoryId) {
    sql += ' AND categoryId = ?';
    params.push(filters.categoryId);
  }
  if (filters?.startDate) {
    sql += ' AND date >= ?';
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    sql += ' AND date <= ?';
    params.push(filters.endDate);
  }
  if (filters?.search) {
    sql += ' AND note LIKE ?';
    params.push(`%${filters.search}%`);
  }

  sql += ' ORDER BY date DESC'; // Default ordering

  const rows = db.getAllSync(sql, params) as Transaction[];
  return rows;
};

export const getTransactionById = (db: SQLite.SQLiteDatabase, id: string): Transaction | null => {
  const row = db.getFirstSync('SELECT * FROM transactions WHERE id = ?', [id]) as Transaction | null;
  return row;
};

// --- Categories ---
// Note: Category CRUD is not explicitly requested but is essential for a functional app.
// Adding basic functions for completeness.

export const addCategory = (
  db: SQLite.SQLiteDatabase,
  category: Omit<Category, 'id' | 'isCustom' | 'isActive'> & { id?: string } // Allow optional id for pre-defined
): Category => {
  const id = category.id || uuidv4();
  const { name, icon, color, type } = category;

  db.runSync(
    'INSERT INTO categories (id, name, icon, color, type, isCustom, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, icon, color, type, 1, 1] // isCustom and isActive default to true for new ones
  );

  return { ...category, id, isCustom: true, isActive: true };
};

export const getCategories = (db: SQLite.SQLiteDatabase, type: 'income' | 'expense' | 'both' = 'both', includeInactive = false): Category[] => {
  let sql = 'SELECT * FROM categories WHERE 1=1';
  const params: any[] = [];

  if (type !== 'both') {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (!includeInactive) {
    sql += ' AND isActive = ?';
    params.push(1);
  }

  sql += ' ORDER BY name ASC';

  const rows = db.getAllSync(sql, params) as Category[];
  return rows;
};

export const updateCategory = (db: SQLite.SQLiteDatabase, id: string, data: Partial<Category>): void => {
  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.icon !== undefined) {
    updates.push('icon = ?');
    params.push(data.icon);
  }
  if (data.color !== undefined) {
    updates.push('color = ?');
    params.push(data.color);
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    params.push(data.type);
  }
  if (data.isActive !== undefined) {
    updates.push('isActive = ?');
    params.push(data.isActive ? 1 : 0);
  }

  params.push(id);
  db.runSync(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);
};

export const deleteCategory = (db: SQLite.SQLiteDatabase, id: string): void => {
  // Consider soft delete or handling related transactions/budgets
  db.runSync('DELETE FROM categories WHERE id = ?', [id]);
};


// --- Budgets ---
export const addBudget = (db: SQLite.SQLiteDatabase, budget: Omit<Budget, 'id'>): Budget => {
  const { categoryId, limit, month } = budget;
  const existing = getBudgetByCategoryId(db, categoryId);
  if (existing) {
    updateBudget(db, existing.id, limit);
    return { ...existing, limit };
  }
  const id = uuidv4();
  db.runSync(
    'INSERT INTO budgets (id, categoryId, limit_amount, month) VALUES (?, ?, ?, ?)',
    [id, categoryId, limit, month ?? null]
  );
  return { id, categoryId, limit, month };
};

export const updateBudget = (db: SQLite.SQLiteDatabase, id: string, limit: number): void => {
  db.runSync('UPDATE budgets SET limit_amount = ? WHERE id = ?', [limit, id]);
};

export const deleteBudget = (db: SQLite.SQLiteDatabase, id: string): void => {
  db.runSync('DELETE FROM budgets WHERE id = ?', [id]);
};

export const getBudgets = (db: SQLite.SQLiteDatabase): Budget[] => {
  const rows = db.getAllSync(
    'SELECT id, categoryId, limit_amount as "limit", month FROM budgets ORDER BY categoryId ASC'
  ) as Budget[];
  return rows;
};

export const getBudgetByCategoryId = (db: SQLite.SQLiteDatabase, categoryId: string): Budget | null => {
  const row = db.getFirstSync(
    'SELECT id, categoryId, limit_amount as "limit", month FROM budgets WHERE categoryId = ?',
    [categoryId]
  ) as Budget | null;
  return row;
};

// --- Settings ---
export const getSetting = (db: SQLite.SQLiteDatabase, key: string): string | null => {
  const row = db.getFirstSync('SELECT value FROM settings WHERE key = ?', [key]) as { value: string } | null;
  return row ? row.value : null;
};

export const setSetting = (db: SQLite.SQLiteDatabase, key: string, value: string): void => {
  db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
};

export const getAllSettings = (db: SQLite.SQLiteDatabase): Record<string, string> => {
  const rows = db.getAllSync('SELECT key, value FROM settings') as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  rows.forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
};

// --- Stats ---
export const getMonthlyStats = (db: SQLite.SQLiteDatabase, year: number, month: number): { income: number; expense: number } => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`; // Simple end of month, could be more precise

  const incomeRow = db.getFirstSync(
    'SELECT SUM(amount) as total FROM transactions WHERE type = "income" AND date BETWEEN ? AND ?',
    [startDate, endDate]
  ) as { total: number | null };

  const expenseRow = db.getFirstSync(
    'SELECT SUM(amount) as total FROM transactions WHERE type = "expense" AND date BETWEEN ? AND ?',
    [startDate, endDate]
  ) as { total: number | null };

  return {
    income: incomeRow?.total || 0,
    expense: expenseRow?.total || 0,
  };
};

export const getPeriodStats = (db: SQLite.SQLiteDatabase, startDate: string, endDate: string): { income: number; expense: number } => {
  const incomeRow = db.getFirstSync(
    'SELECT SUM(amount) as total FROM transactions WHERE type = "income" AND date BETWEEN ? AND ?',
    [startDate, endDate]
  ) as { total: number | null };

  const expenseRow = db.getFirstSync(
    'SELECT SUM(amount) as total FROM transactions WHERE type = "expense" AND date BETWEEN ? AND ?',
    [startDate, endDate]
  ) as { total: number | null };

  return {
    income: incomeRow?.total || 0,
    expense: expenseRow?.total || 0,
  };
};

export const getCategoryStats = (
  db: SQLite.SQLiteDatabase,
  startDate: string,
  endDate: string,
  type: 'expense' | 'income'
): { categoryId: string; total: number }[] => {
  const rows = db.getAllSync(
    `SELECT categoryId, SUM(amount) as total
     FROM transactions
     WHERE type = ? AND date BETWEEN ? AND ?
     GROUP BY categoryId
     ORDER BY total DESC`,
    [type, startDate, endDate]
  ) as { categoryId: string; total: number }[];
  return rows;
};