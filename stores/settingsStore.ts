import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import { getAllSettings, getSetting, setSetting } from '../db/queries';
import { getCurrencySymbol } from '../constants/theme';

interface SettingsState {
  currency: string;
  locale: string;
  name: string;
  theme: 'dark' | 'light' | 'auto';
  dateFormat: string;
  notifyBudget: boolean;
  notifyReminder: boolean;
  reminderTime?: string;
  isLoaded: boolean;
}

interface SettingsStore extends SettingsState {
  loadSettings: (db: SQLite.SQLiteDatabase) => void;
  updateSetting: (db: SQLite.SQLiteDatabase, key: string, value: string) => void;
  getCurrencySymbol: () => string;
}

const defaults: SettingsState = {
  currency: 'XAF',
  locale: 'fr-FR',
  name: '',
  theme: 'dark',
  dateFormat: 'DD/MM/YYYY',
  notifyBudget: true,
  notifyReminder: false,
  reminderTime: undefined,
  isLoaded: false,
};

function parseSettings(raw: Record<string, string>): Partial<SettingsState> {
  return {
    currency: raw.currency ?? defaults.currency,
    locale: raw.locale ?? defaults.locale,
    name: raw.name ?? defaults.name,
    theme: (raw.theme as SettingsState['theme']) ?? defaults.theme,
    dateFormat: raw.dateFormat ?? defaults.dateFormat,
    notifyBudget: raw.notifyBudget === 'true',
    notifyReminder: raw.notifyReminder === 'true',
    reminderTime: raw.reminderTime,
    isLoaded: true,
  };
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaults,

  loadSettings: (db) => {
    const raw = getAllSettings(db);
    set(parseSettings(raw));
  },

  updateSetting: (db, key, value) => {
    setSetting(db, key, value);
    const raw = getAllSettings(db);
    set(parseSettings(raw));
  },

  getCurrencySymbol: () => {
    return getCurrencySymbol(get().currency);
  },
}));
