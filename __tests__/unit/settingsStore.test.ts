jest.mock('../../db/queries', () => ({
  getAllSettings: jest.fn(() => ({})),
  getSetting: jest.fn(),
  setSetting: jest.fn(),
}));

jest.mock('../../constants/theme', () => ({
  getCurrencySymbol: jest.fn(() => 'FCFA'),
}));

const mockDb = {} as any;

// Helper: load a fresh store for each test with controlled DB response
function loadStore(rawSettings: Record<string, string>) {
  let store: any;
  jest.isolateModules(() => {
    const queries = require('../../db/queries');
    queries.getAllSettings.mockReturnValue(rawSettings);
    store = require('../../stores/settingsStore').useSettingsStore;
    store.getState().loadSettings(mockDb);
  });
  return store!.getState();
}

describe('settingsStore defaults', () => {
  test('initial state (before loadSettings) has correct defaults', () => {
    let state: any;
    jest.isolateModules(() => {
      const mod = require('../../stores/settingsStore');
      state = mod.useSettingsStore.getState();
    });
    expect(state.currency).toBe('XAF');
    expect(state.theme).toBe('dark');
    expect(state.locale).toBe('fr-FR');
    expect(state.notifyBudget).toBe(true);
    expect(state.budgetAlertThreshold).toBe(80);
    expect(state.notifyReminder).toBe(false);
    expect(state.reminderTime).toBe('20:00');
    expect(state.isLoaded).toBe(false);
  });
});

describe('settingsStore loadSettings', () => {
  test('parses all settings correctly from DB', () => {
    const state = loadStore({
      currency: 'EUR',
      locale: 'en-US',
      name: 'Alice',
      theme: 'light',
      dateFormat: 'MM/DD/YYYY',
      notifyBudget: 'true',
      budgetAlertThreshold: '90',
      notifyReminder: 'true',
      reminderTime: '08:00',
    });
    expect(state.currency).toBe('EUR');
    expect(state.locale).toBe('en-US');
    expect(state.name).toBe('Alice');
    expect(state.theme).toBe('light');
    expect(state.notifyBudget).toBe(true);
    expect(state.budgetAlertThreshold).toBe(90);
    expect(state.notifyReminder).toBe(true);
    expect(state.reminderTime).toBe('08:00');
    expect(state.isLoaded).toBe(true);
  });

  test('notifyBudget defaults to true when key missing from DB', () => {
    const state = loadStore({});
    expect(state.notifyBudget).toBe(true);
  });

  test('notifyBudget is false only when explicitly set to "false"', () => {
    const state = loadStore({ notifyBudget: 'false' });
    expect(state.notifyBudget).toBe(false);
  });

  test('budgetAlertThreshold uses default 80 when missing', () => {
    const state = loadStore({});
    expect(state.budgetAlertThreshold).toBe(80);
  });

  test('reminderTime uses default 20:00 when missing', () => {
    const state = loadStore({});
    expect(state.reminderTime).toBe('20:00');
  });

  test('notifyReminder is false by default', () => {
    const state = loadStore({});
    expect(state.notifyReminder).toBe(false);
  });

  test('invalid budgetAlertThreshold string "abc" falls back to default 80 (fix: bug 4)', () => {
    const state = loadStore({ budgetAlertThreshold: 'abc' });
    expect(state.budgetAlertThreshold).toBe(80);
    expect(Number.isNaN(state.budgetAlertThreshold)).toBe(false);
  });

  test('budgetAlertThreshold "0" is parsed as 0, not the default', () => {
    const state = loadStore({ budgetAlertThreshold: '0' });
    expect(state.budgetAlertThreshold).toBe(0); // Potentially invalid but not NaN
  });
});
