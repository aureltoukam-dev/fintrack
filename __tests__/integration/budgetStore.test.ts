jest.mock('../../db/queries', () => ({
  getBudgets: jest.fn(() => []),
  addBudget: jest.fn(),
  updateBudget: jest.fn(),
  deleteBudget: jest.fn(),
}));

const mockDb = {} as any;

function freshStore() {
  let store: any;
  jest.isolateModules(() => {
    store = require('../../stores/budgetStore').useBudgetStore;
  });
  return store;
}

beforeEach(() => {
  jest.clearAllMocks();
  const { getBudgets } = require('../../db/queries');
  (getBudgets as jest.Mock).mockReturnValue([]);
});

// ─── loadBudgets ──────────────────────────────────────────────────────────────

describe('budgetStore.loadBudgets', () => {
  test('loads budgets from DB and sets isLoaded=true', () => {
    const { getBudgets } = require('../../db/queries');
    const fakeBudgets = [{ id: '1', categoryId: 'food', limit: 100 }];
    (getBudgets as jest.Mock).mockReturnValue(fakeBudgets);

    const store = freshStore();
    store.getState().loadBudgets(mockDb, '2026-05');

    expect(store.getState().budgets).toEqual(fakeBudgets);
    expect(store.getState().isLoaded).toBe(true);
    expect(getBudgets).toHaveBeenCalledWith(mockDb, '2026-05');
  });

  test('calls getBudgets with undefined when no monthKey given', () => {
    const { getBudgets } = require('../../db/queries');
    const store = freshStore();
    store.getState().loadBudgets(mockDb);
    expect(getBudgets).toHaveBeenCalledWith(mockDb, undefined);
  });
});

// ─── addBudget ────────────────────────────────────────────────────────────────

describe('budgetStore.addBudget', () => {
  test('calls addBudget query and returns new budget', () => {
    const { addBudget: ab, getBudgets: gb } = require('../../db/queries');
    const newBudget = { id: 'new', categoryId: 'rent', limit: 500, month: '2026-05' };
    (ab as jest.Mock).mockReturnValue(newBudget);
    (gb as jest.Mock).mockReturnValue([newBudget]);

    const store = freshStore();
    const result = store.getState().addBudget(mockDb, { categoryId: 'rent', limit: 500, month: '2026-05' });

    expect(result).toEqual(newBudget);
    expect(ab).toHaveBeenCalled();
  });

  test('reloads budgets for the correct month after add', () => {
    const { addBudget: ab, getBudgets: gb } = require('../../db/queries');
    (ab as jest.Mock).mockReturnValue({ id: 'r1', categoryId: 'food', limit: 200, month: '2026-05' });
    (gb as jest.Mock).mockReturnValue([]);

    const store = freshStore();
    store.getState().addBudget(mockDb, { categoryId: 'food', limit: 200, month: '2026-05' });

    expect(gb).toHaveBeenCalledWith(mockDb, '2026-05');
  });

  test('passes null monthKey when budget is recurring (no month)', () => {
    const { addBudget: ab, getBudgets: gb } = require('../../db/queries');
    (ab as jest.Mock).mockReturnValue({ id: 'r1', categoryId: 'food', limit: 200 });
    (gb as jest.Mock).mockReturnValue([]);

    const store = freshStore();
    store.getState().addBudget(mockDb, { categoryId: 'food', limit: 200 });

    expect(gb).toHaveBeenCalledWith(mockDb, null);
  });
});

// ─── updateBudget ─────────────────────────────────────────────────────────────

describe('budgetStore.updateBudget', () => {
  test('calls updateBudget query with correct id and limit', () => {
    const { updateBudget: ub } = require('../../db/queries');
    const store = freshStore();
    store.getState().updateBudget(mockDb, 'b1', 300);
    expect(ub).toHaveBeenCalledWith(mockDb, 'b1', 300);
  });

  test('reloads budgets WITHOUT monthKey after update — state may show stale data (bug)', () => {
    const { getBudgets: gb } = require('../../db/queries');
    const store = freshStore();

    // Simulate: user was viewing May 2026 budgets
    store.getState().loadBudgets(mockDb, '2026-05');
    expect(gb).toHaveBeenLastCalledWith(mockDb, '2026-05');

    // After update, reloads without monthKey — now shows ALL budgets
    store.getState().updateBudget(mockDb, 'b1', 300);
    expect(gb).toHaveBeenLastCalledWith(mockDb, undefined); // BUG: loses month context
  });
});

// ─── deleteBudget ─────────────────────────────────────────────────────────────

describe('budgetStore.deleteBudget', () => {
  test('calls deleteBudget query', () => {
    const { deleteBudget: db2 } = require('../../db/queries');
    const store = freshStore();
    store.getState().deleteBudget(mockDb, 'b1');
    expect(db2).toHaveBeenCalledWith(mockDb, 'b1');
  });

  test('reloads without monthKey after delete — same bug as updateBudget', () => {
    const { getBudgets: gb } = require('../../db/queries');
    const store = freshStore();
    store.getState().loadBudgets(mockDb, '2026-05');
    store.getState().deleteBudget(mockDb, 'b1');
    expect(gb).toHaveBeenLastCalledWith(mockDb, undefined); // BUG
  });
});
