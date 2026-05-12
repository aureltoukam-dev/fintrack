/**
 * Tests for notificationService.
 *
 * Strategy for _alerted deduplication set:
 * - Each test uses a unique budget ID + monthKey combination
 *   so the module-level _alerted set never blocks cross-test scenarios.
 * - The deduplication test uses TWO calls with the same ID intentionally.
 */

import * as Notifications from 'expo-notifications';
import {
  checkAndAlertBudgets,
  scheduleReminder,
  cancelReminder,
} from '../../services/notificationService';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Category } from '../../db/schema';

jest.mock('../../db/queries', () => ({
  getBudgets: jest.fn(),
  getCategoryStats: jest.fn(),
}));

const notifMock = Notifications as any;
const mockDb = {} as any;
const allCategories: Category[] = [
  { id: 'cat-food', name: 'Alimentation', icon: '🍔', color: '#FF0', type: 'expense', isCustom: false, isActive: true },
  { id: 'cat-rent', name: 'Logement',     icon: '🏠', color: '#0FF', type: 'expense', isCustom: false, isActive: true },
];

beforeEach(() => {
  notifMock.__reset();
  (Notifications.scheduleNotificationAsync as jest.Mock).mockClear();
  (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockClear();
  const { getBudgets, getCategoryStats } = require('../../db/queries');
  (getBudgets as jest.Mock).mockReset();
  (getCategoryStats as jest.Mock).mockReset();
});

// ─── checkAndAlertBudgets ─────────────────────────────────────────────────────

describe('checkAndAlertBudgets', () => {
  test('no budgets → no notifications sent', async () => {
    const { getBudgets, getCategoryStats } = require('../../db/queries');
    (getBudgets as jest.Mock).mockReturnValue([]);
    (getCategoryStats as jest.Mock).mockReturnValue([]);

    await checkAndAlertBudgets(mockDb, '2025-01', 80, allCategories);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('spending below threshold → no notification', async () => {
    const { getBudgets, getCategoryStats } = require('../../db/queries');
    (getBudgets as jest.Mock).mockReturnValue([{ id: 'b-below', categoryId: 'cat-food', limit: 100 }]);
    (getCategoryStats as jest.Mock).mockReturnValue([{ categoryId: 'cat-food', total: 70 }]); // 70%

    await checkAndAlertBudgets(mockDb, '2025-02', 80, allCategories);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('spending exactly at threshold → notification fires', async () => {
    const { getBudgets, getCategoryStats } = require('../../db/queries');
    (getBudgets as jest.Mock).mockReturnValue([{ id: 'b-exact', categoryId: 'cat-food', limit: 100 }]);
    (getCategoryStats as jest.Mock).mockReturnValue([{ categoryId: 'cat-food', total: 80 }]); // 80%

    await checkAndAlertBudgets(mockDb, '2025-03', 80, allCategories);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.title).toBe('⚠️ Alerte budget');
    expect(call.content.body).toContain('Alimentation');
    expect(call.content.body).toContain('80%');
  });

  test('spending over 100% → "Budget dépassé" title', async () => {
    const { getBudgets, getCategoryStats } = require('../../db/queries');
    (getBudgets as jest.Mock).mockReturnValue([{ id: 'b-over', categoryId: 'cat-food', limit: 100 }]);
    (getCategoryStats as jest.Mock).mockReturnValue([{ categoryId: 'cat-food', total: 120 }]); // 120%

    await checkAndAlertBudgets(mockDb, '2025-04', 80, allCategories);
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.title).toBe('🚨 Budget dépassé');
  });

  test('same budget+month+bracket called twice → only one notification (deduplication)', async () => {
    const { getBudgets, getCategoryStats } = require('../../db/queries');
    (getBudgets as jest.Mock).mockReturnValue([{ id: 'b-dedup', categoryId: 'cat-food', limit: 100 }]);
    (getCategoryStats as jest.Mock).mockReturnValue([{ categoryId: 'cat-food', total: 85 }]); // 80% bracket

    await checkAndAlertBudgets(mockDb, '2025-05', 80, allCategories);
    await checkAndAlertBudgets(mockDb, '2025-05', 80, allCategories);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  test('unknown categoryId falls back to categoryId string in body', async () => {
    const { getBudgets, getCategoryStats } = require('../../db/queries');
    (getBudgets as jest.Mock).mockReturnValue([{ id: 'b-unknown', categoryId: 'unknown-xyz', limit: 50 }]);
    (getCategoryStats as jest.Mock).mockReturnValue([{ categoryId: 'unknown-xyz', total: 50 }]); // 100%

    await checkAndAlertBudgets(mockDb, '2025-06', 80, allCategories);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.body).toContain('unknown-xyz');
  });

  test('zero-limit budget → no division error, no notification', async () => {
    const { getBudgets, getCategoryStats } = require('../../db/queries');
    (getBudgets as jest.Mock).mockReturnValue([{ id: 'b-zero', categoryId: 'cat-food', limit: 0 }]);
    (getCategoryStats as jest.Mock).mockReturnValue([{ categoryId: 'cat-food', total: 50 }]);

    await expect(checkAndAlertBudgets(mockDb, '2025-07', 80, allCategories)).resolves.not.toThrow();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('endDate uses hardcoded "31" for all months — invalid for 30-day months (bug)', async () => {
    const { getBudgets, getCategoryStats } = require('../../db/queries');
    (getBudgets as jest.Mock).mockReturnValue([{ id: 'b-apr', categoryId: 'cat-food', limit: 100 }]);
    (getCategoryStats as jest.Mock).mockReturnValue([]);

    await checkAndAlertBudgets(mockDb, '2025-04', 80, allCategories); // April = 30 days
    // Expected: getCategoryStats called with invalid date '2025-04-31'
    expect(getCategoryStats).toHaveBeenCalledWith(mockDb, '2025-04-01', '2025-04-31', 'expense');
    // BUG: '2025-04-31' is not a real date — should be '2025-04-30'
  });

  test('multiple budgets: only at-threshold fires, below-threshold does not', async () => {
    const { getBudgets, getCategoryStats } = require('../../db/queries');
    (getBudgets as jest.Mock).mockReturnValue([
      { id: 'b-multi-a', categoryId: 'cat-food', limit: 100 },
      { id: 'b-multi-b', categoryId: 'cat-rent', limit: 1000 },
    ]);
    (getCategoryStats as jest.Mock).mockReturnValue([
      { categoryId: 'cat-food', total: 90 },  // 90% → fires
      { categoryId: 'cat-rent', total: 400 }, // 40% → no fire
    ]);

    await checkAndAlertBudgets(mockDb, '2025-08', 80, allCategories);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.body).toContain('Alimentation');
  });

  test('category without spending entry is treated as 0% (no alert)', async () => {
    const { getBudgets, getCategoryStats } = require('../../db/queries');
    (getBudgets as jest.Mock).mockReturnValue([{ id: 'b-nospend', categoryId: 'cat-food', limit: 100 }]);
    (getCategoryStats as jest.Mock).mockReturnValue([]); // no spending data

    await checkAndAlertBudgets(mockDb, '2025-09', 80, allCategories);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

// ─── scheduleReminder ─────────────────────────────────────────────────────────

describe('scheduleReminder', () => {
  test('cancels previous reminder before scheduling new one', async () => {
    await scheduleReminder('20:00');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('daily-reminder');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  test('uses DAILY recurring trigger type', async () => {
    await scheduleReminder('08:30');
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.trigger.type).toBe(SchedulableTriggerInputTypes.DAILY);
  });

  test('sets correct hour and minute from time string', async () => {
    await scheduleReminder('14:45');
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.trigger.hour).toBe(14);
    expect(call.trigger.minute).toBe(45);
  });

  test('uses "daily-reminder" as identifier', async () => {
    await scheduleReminder('20:00');
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.identifier).toBe('daily-reminder');
  });

  test('midnight edge case 00:00 parses correctly', async () => {
    await scheduleReminder('00:00');
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.trigger.hour).toBe(0);
    expect(call.trigger.minute).toBe(0);
  });
});

// ─── cancelReminder ───────────────────────────────────────────────────────────

describe('cancelReminder', () => {
  test('cancels the daily-reminder notification', async () => {
    await cancelReminder();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('daily-reminder');
  });

  test('does not throw even when no reminder was scheduled', async () => {
    await expect(cancelReminder()).resolves.not.toThrow();
  });
});
