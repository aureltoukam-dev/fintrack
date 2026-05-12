import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as SQLite from 'expo-sqlite';
import { getBudgets } from '../db/queries';
import { getCategoryStats } from '../db/queries';
import { Category } from '../db/schema';

// In-memory set to avoid spamming the same alert within a session
const _alerted = new Set<string>();

export const setupNotificationHandler = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

export const requestPermissions = async (): Promise<boolean> => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// ─── Budget alerts ───────────────────────────────────────────────────────────

export const checkAndAlertBudgets = async (
  db: SQLite.SQLiteDatabase,
  monthKey: string,         // 'YYYY-MM'
  threshold: number,        // e.g. 80 (%)
  allCategories: Category[]
): Promise<void> => {
  const budgets = getBudgets(db, monthKey);
  if (!budgets.length) return;

  const [year, month] = monthKey.split('-');
  const startDate = `${year}-${month}-01`;
  const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
  const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  const stats = getCategoryStats(db, startDate, endDate, 'expense');

  for (const budget of budgets) {
    const spending = stats.find(s => s.categoryId === budget.categoryId)?.total ?? 0;
    const percent = budget.limit > 0 ? (spending / budget.limit) * 100 : 0;

    if (percent < threshold) continue;

    // Key: budget + month + bracket (each 10% bracket fires at most once per session)
    const bracket = Math.floor(percent / 10) * 10;
    const alertKey = `${budget.id}-${monthKey}-${bracket}`;
    if (_alerted.has(alertKey)) continue;
    _alerted.add(alertKey);

    const category = allCategories.find(c => c.id === budget.categoryId);
    const name = category?.name ?? budget.categoryId;
    const rounded = Math.round(percent);
    const isOver = percent >= 100;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: isOver ? '🚨 Budget dépassé' : '⚠️ Alerte budget',
        body: isOver
          ? `Budget ${name} dépassé (${rounded}% consommé)`
          : `Budget ${name} à ${rounded}% — seuil d'alerte atteint`,
        sound: true,
      },
      trigger: null,
      identifier: `budget-${budget.id}-${monthKey}-${bracket}`,
    });
  }
};

export const cancelAllBudgetAlerts = async (): Promise<void> => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith('budget-')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
};

// ─── Daily reminder ──────────────────────────────────────────────────────────

export const scheduleReminder = async (time: string): Promise<void> => {
  // Cancel existing before rescheduling
  await Notifications.cancelScheduledNotificationAsync('daily-reminder').catch(() => {});

  const [hours, minutes] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'FinTrack',
      body: "N'oubliez pas de saisir vos dépenses du jour !",
      sound: true,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
    },
    identifier: 'daily-reminder',
  });
};

export const cancelReminder = async (): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync('daily-reminder').catch(() => {});
};
