import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Transaction, Budget, Category } from '../db/schema'; // Assuming these types are defined elsewhere

// Store scheduled notifications to avoid duplicates and for cancellation
const scheduledBudgetAlerts: Record<string, boolean> = {}; // { budgetId: true }

export const requestPermissions = async (): Promise<boolean> => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleBudgetAlert = async (
  categoryName: string,
  percent: number,
  budgetId: string
): Promise<void> => {
  if (scheduledBudgetAlerts[budgetId]) {
    // Already scheduled for this budget this month (or generally)
    return;
  }

  const trigger = new Date(Date.now() + 60 * 1000); // Schedule for 1 minute from now as an example
  // In a real app, you'd calculate the trigger based on when the budget is nearing its limit.
  // For this example, we'll just schedule it once. A more complex logic would be needed
  // to check the current spending against the budget and schedule accordingly.

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Alerte budget',
        body: `Vous avez consommé ${percent}% de votre budget ${categoryName}`,
        sound: true, // optional
      },
      trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 60 },
      identifier: `budget-alert-${budgetId}`, // Unique identifier for this alert
    });
    scheduledBudgetAlerts[budgetId] = true;
    console.log(`Budget alert scheduled for budget ID: ${budgetId}`);
  } catch (error) {
    console.error('Error scheduling budget alert:', error);
    throw error;
  }
};

export const cancelBudgetAlert = async (budgetId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(`budget-alert-${budgetId}`);
    delete scheduledBudgetAlerts[budgetId];
    console.log(`Budget alert cancelled for budget ID: ${budgetId}`);
  } catch (error) {
    console.error('Error cancelling budget alert:', error);
    throw error;
  }
};

export const scheduleReminder = async (time: string): Promise<void> => {
  // time format "HH:MM"
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const triggerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

  // If the time has already passed today, schedule for tomorrow
  if (triggerDate.getTime() <= now.getTime()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rappel FinTrack',
        body: 'N\'oubliez pas de saisir vos transactions du jour !',
        sound: true,
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: triggerDate },
      identifier: 'daily-reminder',
    });
    console.log(`Daily reminder scheduled for ${time}`);
  } catch (error) {
    console.error('Error scheduling reminder:', error);
    throw error;
  }
};

export const cancelReminder = async (): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync('daily-reminder');
    console.log('Daily reminder cancelled.');
  } catch (error) {
    console.error('Error cancelling reminder:', error);
    throw error;
  }
};

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