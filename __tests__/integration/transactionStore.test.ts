jest.mock('../../db/queries', () => ({
  addTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  getTransactions: jest.fn(() => []),
  getTransactionById: jest.fn(() => null),
  getPeriodStats: jest.fn(() => ({ income: 0, expense: 0 })),
  getCategoryStats: jest.fn(() => []),
}));

jest.mock('../../services/notificationService', () => ({
  checkAndAlertBudgets: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../stores/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({ notifyBudget: true, budgetAlertThreshold: 80 })),
  },
}));

jest.mock('../../stores/categoryStore', () => ({
  useCategoryStore: {
    getState: jest.fn(() => ({ allCategories: [] })),
  },
}));

import { useTransactionStore } from '../../stores/transactionStore';
import { checkAndAlertBudgets } from '../../services/notificationService';
import { useSettingsStore } from '../../stores/settingsStore';

const mockCheckAlerts = checkAndAlertBudgets as jest.Mock;
const mockDb = {} as any;

beforeEach(() => {
  jest.clearAllMocks();
  const q = require('../../db/queries');
  (q.getTransactions as jest.Mock).mockReturnValue([]);
  (q.getTransactionById as jest.Mock).mockReturnValue(null);
  (useSettingsStore.getState as jest.Mock).mockReturnValue({ notifyBudget: true, budgetAlertThreshold: 80 });
  useTransactionStore.setState({ transactions: [], isLoaded: false });
});

// ─── addTransaction ───────────────────────────────────────────────────────────

describe('transactionStore.addTransaction', () => {
  test('calls addTransaction query and returns the new transaction', () => {
    const { addTransaction: at } = require('../../db/queries');
    const newTx = { id: 'tx1', date: '2026-05-12', amount: 50, type: 'expense', categoryId: 'food', createdAt: '' };
    (at as jest.Mock).mockReturnValue(newTx);

    const result = useTransactionStore.getState().addTransaction(mockDb, {
      date: '2026-05-12', amount: 50, type: 'expense', categoryId: 'food',
    });
    expect(result).toEqual(newTx);
  });

  test('triggers budget alert check for expense transactions', async () => {
    const { addTransaction: at } = require('../../db/queries');
    (at as jest.Mock).mockReturnValue({ id: 'tx1', date: '2026-05-12', amount: 50, type: 'expense', categoryId: 'food', createdAt: '' });

    useTransactionStore.getState().addTransaction(mockDb, {
      date: '2026-05-12', amount: 50, type: 'expense', categoryId: 'food',
    });

    await new Promise(r => setTimeout(r, 10));
    expect(mockCheckAlerts).toHaveBeenCalledWith(mockDb, '2026-05', 80, []);
  });

  test('does NOT trigger budget check for income transactions', async () => {
    const { addTransaction: at } = require('../../db/queries');
    (at as jest.Mock).mockReturnValue({ id: 'tx2', date: '2026-05-12', amount: 1000, type: 'income', categoryId: 'salary', createdAt: '' });

    useTransactionStore.getState().addTransaction(mockDb, {
      date: '2026-05-12', amount: 1000, type: 'income', categoryId: 'salary',
    });

    await new Promise(r => setTimeout(r, 10));
    expect(mockCheckAlerts).not.toHaveBeenCalled();
  });

  test('does NOT trigger budget check when notifyBudget is disabled', async () => {
    (useSettingsStore.getState as jest.Mock).mockReturnValue({ notifyBudget: false, budgetAlertThreshold: 80 });

    const { addTransaction: at } = require('../../db/queries');
    (at as jest.Mock).mockReturnValue({ id: 'tx3', date: '2026-05-12', amount: 50, type: 'expense', categoryId: 'food', createdAt: '' });

    useTransactionStore.getState().addTransaction(mockDb, {
      date: '2026-05-12', amount: 50, type: 'expense', categoryId: 'food',
    });

    await new Promise(r => setTimeout(r, 10));
    expect(mockCheckAlerts).not.toHaveBeenCalled();
  });

  test('extracts correct monthKey from transaction date', async () => {
    const { addTransaction: at } = require('../../db/queries');
    (at as jest.Mock).mockReturnValue({ id: 'tx4', date: '2026-11-03', amount: 50, type: 'expense', categoryId: 'food', createdAt: '' });

    useTransactionStore.getState().addTransaction(mockDb, {
      date: '2026-11-03', amount: 50, type: 'expense', categoryId: 'food',
    });

    await new Promise(r => setTimeout(r, 10));
    expect(mockCheckAlerts).toHaveBeenCalledWith(mockDb, '2026-11', 80, []);
  });
});

// ─── updateTransaction ────────────────────────────────────────────────────────

describe('transactionStore.updateTransaction', () => {
  test('calls updateTransaction query', () => {
    const { updateTransaction: ut } = require('../../db/queries');
    useTransactionStore.getState().updateTransaction(mockDb, 'tx1', { amount: 75 });
    expect(ut).toHaveBeenCalledWith(mockDb, 'tx1', { amount: 75 });
  });

  test('triggers budget check when update includes type=expense and date', async () => {
    useTransactionStore.getState().updateTransaction(mockDb, 'tx1', {
      type: 'expense', date: '2026-05-12', amount: 90,
    });

    await new Promise(r => setTimeout(r, 10));
    expect(mockCheckAlerts).toHaveBeenCalledWith(mockDb, '2026-05', 80, []);
  });

  test('triggers check for amount-only update by looking up DB row (fix: bug 2)', async () => {
    const { getTransactionById: gtb } = require('../../db/queries');
    (gtb as jest.Mock).mockReturnValue({
      id: 'tx1', date: '2026-05-12', amount: 90, type: 'expense', categoryId: 'food', createdAt: '',
    });

    useTransactionStore.getState().updateTransaction(mockDb, 'tx1', { amount: 90 });

    await new Promise(r => setTimeout(r, 10));
    expect(mockCheckAlerts).toHaveBeenCalledWith(mockDb, '2026-05', 80, []);
  });

  test('no check when existing row is income (amount-only update)', async () => {
    const { getTransactionById: gtb } = require('../../db/queries');
    (gtb as jest.Mock).mockReturnValue({
      id: 'tx1', date: '2026-05-12', amount: 200, type: 'income', categoryId: 'salary', createdAt: '',
    });

    useTransactionStore.getState().updateTransaction(mockDb, 'tx1', { amount: 200 });

    await new Promise(r => setTimeout(r, 10));
    expect(mockCheckAlerts).not.toHaveBeenCalled();
  });

  test('no check when transaction no longer exists in DB', async () => {
    const { getTransactionById: gtb } = require('../../db/queries');
    (gtb as jest.Mock).mockReturnValue(null);

    useTransactionStore.getState().updateTransaction(mockDb, 'ghost', { amount: 90 });

    await new Promise(r => setTimeout(r, 10));
    expect(mockCheckAlerts).not.toHaveBeenCalled();
  });

  test('does NOT trigger check for income updates', async () => {
    useTransactionStore.getState().updateTransaction(mockDb, 'tx1', { type: 'income', date: '2026-05-12' });

    await new Promise(r => setTimeout(r, 10));
    expect(mockCheckAlerts).not.toHaveBeenCalled();
  });

  test('does NOT trigger check when date is missing (type present, date absent)', async () => {
    useTransactionStore.getState().updateTransaction(mockDb, 'tx1', { type: 'expense', amount: 50 });

    await new Promise(r => setTimeout(r, 10));
    expect(mockCheckAlerts).not.toHaveBeenCalled();
    // data.date is undefined → monthKey can't be computed → check is skipped
  });
});

// ─── deleteTransaction ────────────────────────────────────────────────────────

describe('transactionStore.deleteTransaction', () => {
  test('calls deleteTransaction query', () => {
    const { deleteTransaction: dt } = require('../../db/queries');
    useTransactionStore.getState().deleteTransaction(mockDb, 'tx1');
    expect(dt).toHaveBeenCalledWith(mockDb, 'tx1');
  });

  test('reloads transactions after delete', () => {
    const { getTransactions: gt } = require('../../db/queries');
    useTransactionStore.getState().deleteTransaction(mockDb, 'tx1');
    expect(gt).toHaveBeenCalled();
  });
});
