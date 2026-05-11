// TypeScript interfaces matching the database schema
export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  note?: string;
  createdAt: string; // ISO 8601
  updatedAt?: string; // ISO 8601
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  isCustom: boolean;
  isActive: boolean;
}

export interface Budget {
  id: string;
  categoryId: string;
  limit: number;
  month?: string; // YYYY-MM, optional for recurring budgets
}

export interface Settings {
  currency: string;
  locale: string;
  name: string;
  theme: 'dark' | 'light' | 'auto';
  dateFormat: string;
  notifyBudget: boolean;
  notifyReminder: boolean;
  reminderTime?: string; // HH:MM
}
export type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom';
