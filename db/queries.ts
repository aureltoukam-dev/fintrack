import * as SQLite from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, Budget, Settings } from './schema';

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

// --- Custom Categories ---
export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  isActive: number;
}

export const getCustomCategories = (db: SQLite.SQLiteDatabase): CustomCategory[] => {
  return db.getAllSync('SELECT * FROM custom_categories WHERE isActive = 1 ORDER BY name ASC') as CustomCategory[];
};

export const addCustomCategory = (
  db: SQLite.SQLiteDatabase,
  data: Omit<CustomCategory, 'id' | 'isActive'>
): CustomCategory => {
  const id = uuidv4();
  db.runSync(
    'INSERT INTO custom_categories (id, name, icon, color, type, isActive) VALUES (?, ?, ?, ?, ?, 1)',
    [id, data.name, data.icon, data.color, data.type]
  );
  return { ...data, id, isActive: 1 };
};

export const updateCustomCategory = (
  db: SQLite.SQLiteDatabase,
  id: string,
  data: Partial<Omit<CustomCategory, 'id'>>
): void => {
  const fields: string[] = [];
  const params: any[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
  if (data.icon !== undefined) { fields.push('icon = ?'); params.push(data.icon); }
  if (data.color !== undefined) { fields.push('color = ?'); params.push(data.color); }
  if (data.type !== undefined) { fields.push('type = ?'); params.push(data.type); }
  if (data.isActive !== undefined) { fields.push('isActive = ?'); params.push(data.isActive); }
  if (fields.length === 0) return;
  params.push(id);
  db.runSync(`UPDATE custom_categories SET ${fields.join(', ')} WHERE id = ?`, params);
};

export const deleteCustomCategory = (db: SQLite.SQLiteDatabase, id: string): void => {
  db.runSync('UPDATE custom_categories SET isActive = 0 WHERE id = ?', [id]);
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