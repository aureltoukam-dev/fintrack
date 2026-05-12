import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import { Category } from '../db/schema';
import { CATEGORIES, setRuntimeCategories } from '../constants/categories';
import {
  getCustomCategories,
  addCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
  CustomCategory,
} from '../db/queries';

interface CategoryStore {
  customCategories: CustomCategory[];
  allCategories: Category[];
  isLoaded: boolean;
  loadCategories: (db: SQLite.SQLiteDatabase) => void;
  addCategory: (db: SQLite.SQLiteDatabase, data: Omit<CustomCategory, 'id' | 'isActive'>) => CustomCategory;
  updateCategory: (db: SQLite.SQLiteDatabase, id: string, data: Partial<Omit<CustomCategory, 'id'>>) => void;
  deleteCategory: (db: SQLite.SQLiteDatabase, id: string) => void;
}

const toCategory = (c: CustomCategory): Category => ({
  id: c.id,
  name: c.name,
  icon: c.icon,
  color: c.color,
  type: c.type as 'income' | 'expense' | 'both',
  isCustom: true,
  isActive: c.isActive === 1,
});

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  customCategories: [],
  allCategories: CATEGORIES,
  isLoaded: false,

  loadCategories: (db) => {
    const custom = getCustomCategories(db);
    const customAsCategory = custom.map(toCategory);
    const all = [...CATEGORIES, ...customAsCategory];
    setRuntimeCategories(all);
    set({ customCategories: custom, allCategories: all, isLoaded: true });
  },

  addCategory: (db, data) => {
    const cat = addCustomCategory(db, data);
    get().loadCategories(db);
    return cat;
  },

  updateCategory: (db, id, data) => {
    updateCustomCategory(db, id, data);
    get().loadCategories(db);
  },

  deleteCategory: (db, id) => {
    deleteCustomCategory(db, id);
    get().loadCategories(db);
  },
}));
