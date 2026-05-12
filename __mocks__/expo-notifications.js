const scheduled = {};

const SchedulableTriggerInputTypes = {
  DATE: 'date',
  TIME_INTERVAL: 'timeInterval',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  CALENDAR: 'calendar',
};

module.exports = {
  SchedulableTriggerInputTypes,
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async ({ identifier, content, trigger }) => {
    scheduled[identifier] = { content, trigger };
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id) => {
    delete scheduled[id];
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () =>
    Object.entries(scheduled).map(([identifier, data]) => ({ identifier, ...data }))
  ),
  __scheduled: scheduled,
  __reset: () => { Object.keys(scheduled).forEach(k => delete scheduled[k]); },
};
