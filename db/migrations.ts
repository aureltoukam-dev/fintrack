import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export const openDatabase = (): SQLite.SQLiteDatabase => {
  if (!_db) {
    _db = SQLite.openDatabaseSync('fintrack.db');
  }
  return _db;
};

export const runMigrations = (database: SQLite.SQLiteDatabase) => {
  // Create tables (no FK constraints for offline simplicity)
  database.execSync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      categoryId TEXT NOT NULL,
      note TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      categoryId TEXT NOT NULL UNIQUE,
      limit_amount REAL NOT NULL CHECK(limit_amount > 0),
      month TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Create indexes
  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (categoryId);
    CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets (categoryId);
    CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets (month);
  `);

  const defaults: [string, string][] = [
    ['currency', 'XAF'],
    ['theme', 'dark'],
    ['locale', 'fr-FR'],
    ['notifyBudget', 'true'],
    ['notifyReminder', 'false'],
    ['name', ''],
    ['dateFormat', 'DD/MM/YYYY'],
  ];
  for (const [key, value] of defaults) {
    database.runSync(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }
};