import { Category } from '../db/schema';

export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Alimentation', icon: '🛒', color: '#FF6B6B', type: 'expense', isCustom: false, isActive: true },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#4ECDC4', type: 'expense', isCustom: false, isActive: true },
  { id: 'housing', name: 'Logement', icon: '🏠', color: '#45B7D1', type: 'expense', isCustom: false, isActive: true },
  { id: 'health', name: 'Santé', icon: '💊', color: '#96CEB4', type: 'expense', isCustom: false, isActive: true },
  { id: 'leisure', name: 'Loisirs', icon: '🎬', color: '#FFEAA7', type: 'expense', isCustom: false, isActive: true },
  { id: 'education', name: 'Éducation', icon: '📚', color: '#DDA0DD', type: 'expense', isCustom: false, isActive: true },
  { id: 'clothing', name: 'Habillement', icon: '👕', color: '#F0E68C', type: 'expense', isCustom: false, isActive: true },
  { id: 'telecom', name: 'Télécom', icon: '📱', color: '#87CEEB', type: 'expense', isCustom: false, isActive: true },
  { id: 'salary', name: 'Salaire', icon: '💼', color: '#4ECDC4', type: 'income', isCustom: false, isActive: true },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: '#7C6FFF', type: 'income', isCustom: false, isActive: true },
  { id: 'business', name: 'Commerce', icon: '🏪', color: '#FFD166', type: 'income', isCustom: false, isActive: true },
  { id: 'transfer', name: 'Virement reçu', icon: '💸', color: '#06D6A0', type: 'income', isCustom: false, isActive: true },
  { id: 'other', name: 'Autre', icon: '📌', color: '#9896B0', type: 'both', isCustom: false, isActive: true },
];

let _runtimeCategories: Category[] = CATEGORIES;

export const setRuntimeCategories = (cats: Category[]) => {
  _runtimeCategories = cats;
};

export const getCategoryById = (id: string): Category | undefined =>
  _runtimeCategories.find(c => c.id === id);

export const getCategoriesByType = (type: 'income' | 'expense'): Category[] =>
  _runtimeCategories.filter(c => (c.type === type || c.type === 'both') && c.isActive);

export const EXPENSE_CATEGORIES = CATEGORIES.filter(c => c.type === 'expense' || c.type === 'both');
export const INCOME_CATEGORIES = CATEGORIES.filter(c => c.type === 'income' || c.type === 'both');