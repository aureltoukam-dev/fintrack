import {
  getPeriodDates,
  getOffsetPeriodDates,
  getBarSlicesForPeriod,
  formatDate,
  formatCurrency,
  getLast6Months,
  groupTransactionsByDate,
  MONTH_FULL,
} from '../../services/periodFilter';
import { Transaction } from '../../db/schema';

// Fix "today" to a known date for deterministic tests
const FIXED_DATE = new Date('2026-05-12T12:00:00.000Z');
const _origDate = global.Date;

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_DATE);
});

afterAll(() => {
  jest.useRealTimers();
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  test('formats DD/MM/YYYY correctly', () => {
    expect(formatDate('2026-05-12', 'DD/MM/YYYY')).toBe('12/05/2026');
  });

  test('formats MM/DD/YYYY correctly', () => {
    expect(formatDate('2026-01-07', 'MM/DD/YYYY')).toBe('01/07/2026');
  });

  test('handles time tokens HH:mm', () => {
    expect(formatDate('2026-05-12T14:30:00', 'DD/MM/YYYY HH:mm')).toBe('12/05/2026 14:30');
  });
});

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  test('formats XAF without decimals', () => {
    const result = formatCurrency(5000, 'XAF', 'fr-FR');
    expect(result).toContain('5');
    expect(result).toContain('000');
  });

  test('formats EUR with symbol', () => {
    const result = formatCurrency(12.5, 'EUR', 'fr-FR');
    expect(result).toContain('12');
    expect(result).toContain('€');
  });

  test('handles zero amount', () => {
    const result = formatCurrency(0, 'XAF', 'fr-FR');
    expect(result).toContain('0');
  });
});

// ─── getPeriodDates ───────────────────────────────────────────────────────────

describe('getPeriodDates', () => {
  test('week: startDate is Monday, label is CETTE SEMAINE', () => {
    const { startDate, endDate, label } = getPeriodDates('week');
    const start = new Date(startDate);
    expect(start.getDay()).toBe(1); // Monday
    expect(label).toBe('CETTE SEMAINE');
    expect(startDate <= endDate).toBe(true);
  });

  test('month: startDate is first of month', () => {
    const { startDate, label } = getPeriodDates('month');
    expect(startDate).toBe('2026-05-01');
    expect(label).toBe('CE MOIS');
  });

  test('quarter: startDate is first day of current quarter', () => {
    const { startDate, label } = getPeriodDates('quarter');
    // May is Q2 (April 1)
    expect(startDate).toBe('2026-04-01');
    expect(label).toBe('CE TRIMESTRE');
  });

  test('year: startDate is Jan 1', () => {
    const { startDate, label } = getPeriodDates('year');
    expect(startDate).toBe('2026-01-01');
    expect(label).toBe('CETTE ANNÉE');
  });

  test('custom: uses provided dates and formats label', () => {
    const { startDate, endDate, label } = getPeriodDates('custom', '2026-03-01', '2026-03-31');
    expect(startDate).toBe('2026-03-01');
    expect(endDate).toBe('2026-03-31');
    expect(label).toContain('01/03');
    expect(label).toContain('31/03');
  });

  test('custom: throws when dates missing', () => {
    expect(() => getPeriodDates('custom')).toThrow();
  });

  test('unknown period throws', () => {
    // @ts-expect-error testing invalid input
    expect(() => getPeriodDates('decade')).toThrow();
  });
});

// ─── getOffsetPeriodDates ─────────────────────────────────────────────────────

describe('getOffsetPeriodDates', () => {
  test('month offset=0 returns current month', () => {
    const { startDate, endDate, label, monthKey } = getOffsetPeriodDates('month', 0);
    expect(startDate).toBe('2026-05-01');
    expect(endDate).toBe('2026-05-31');
    expect(label).toBe('Mai 2026');
    expect(monthKey).toBe('2026-05');
  });

  test('month offset=-1 returns previous month', () => {
    const { startDate, endDate, label, monthKey } = getOffsetPeriodDates('month', -1);
    expect(startDate).toBe('2026-04-01');
    expect(endDate).toBe('2026-04-30');
    expect(label).toBe('Avril 2026');
    expect(monthKey).toBe('2026-04');
  });

  test('month offset=-4 crosses year boundary', () => {
    const { startDate, monthKey } = getOffsetPeriodDates('month', -4);
    expect(startDate).toBe('2026-01-01');
    expect(monthKey).toBe('2026-01');
  });

  test('month offset=-5 goes to December of previous year', () => {
    const { startDate, endDate, monthKey } = getOffsetPeriodDates('month', -5);
    expect(startDate).toBe('2025-12-01');
    expect(endDate).toBe('2025-12-31');
    expect(monthKey).toBe('2025-12');
  });

  test('year offset=0 returns current year', () => {
    const { startDate, endDate, label } = getOffsetPeriodDates('year', 0);
    expect(startDate).toBe('2026-01-01');
    expect(endDate).toBe('2026-12-31');
    expect(label).toBe('2026');
  });

  test('year offset=-1 returns previous year', () => {
    const { startDate, label } = getOffsetPeriodDates('year', -1);
    expect(startDate).toBe('2025-01-01');
    expect(label).toBe('2025');
  });

  test('quarter offset=0 returns Q2 2026', () => {
    const { startDate, endDate, label } = getOffsetPeriodDates('quarter', 0);
    expect(startDate).toBe('2026-04-01');
    expect(endDate).toBe('2026-06-30');
    expect(label).toBe('T2 2026');
  });

  test('quarter offset=-1 returns Q1 2026', () => {
    const { startDate, endDate, label } = getOffsetPeriodDates('quarter', -1);
    expect(startDate).toBe('2026-01-01');
    expect(endDate).toBe('2026-03-31');
    expect(label).toBe('T1 2026');
  });

  test('week offset=0 returns 7-day range starting Monday', () => {
    const { startDate, endDate } = getOffsetPeriodDates('week', 0);
    const start = new Date(startDate);
    const end = new Date(endDate);
    expect(start.getDay()).toBe(1); // Monday
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(6); // 7 days inclusive
  });

  test('week offset=-1 returns previous week', () => {
    const current = getOffsetPeriodDates('week', 0);
    const prev = getOffsetPeriodDates('week', -1);
    const currentStart = new Date(current.startDate).getTime();
    const prevStart = new Date(prev.startDate).getTime();
    expect(currentStart - prevStart).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

// ─── getBarSlicesForPeriod ────────────────────────────────────────────────────

describe('getBarSlicesForPeriod', () => {
  test('week returns exactly 7 slices', () => {
    const slices = getBarSlicesForPeriod('week');
    expect(slices).toHaveLength(7);
    expect(slices[0].label).toBe('LUN');
    expect(slices[6].label).toBe('DIM');
  });

  test('month returns 4 or 5 slices (weeks)', () => {
    const slices = getBarSlicesForPeriod('month');
    expect(slices.length).toBeGreaterThanOrEqual(4);
    expect(slices.length).toBeLessThanOrEqual(5);
    expect(slices[0].label).toBe('S1');
  });

  test('quarter returns exactly 3 slices (months)', () => {
    const slices = getBarSlicesForPeriod('quarter');
    expect(slices).toHaveLength(3);
  });

  test('year returns exactly 12 slices (months)', () => {
    const slices = getBarSlicesForPeriod('year');
    expect(slices).toHaveLength(12);
    expect(slices[0].label).toBe('JAN');
    expect(slices[11].label).toBe('DÉC');
  });

  test('each slice has start <= end', () => {
    const slices = getBarSlicesForPeriod('month');
    for (const s of slices) {
      expect(s.start <= s.end).toBe(true);
    }
  });
});

// ─── getLast6Months ───────────────────────────────────────────────────────────

describe('getLast6Months', () => {
  test('returns exactly 6 months', () => {
    expect(getLast6Months()).toHaveLength(6);
  });

  test('last entry is current month', () => {
    const months = getLast6Months();
    const last = months[months.length - 1];
    expect(last.monthNum).toBe('05');
    expect(last.year).toBe(2026);
  });

  test('months are in ascending order', () => {
    const months = getLast6Months();
    for (let i = 1; i < months.length; i++) {
      const prev = new Date(months[i - 1].year, parseInt(months[i - 1].monthNum) - 1);
      const curr = new Date(months[i].year, parseInt(months[i].monthNum) - 1);
      expect(prev.getTime()).toBeLessThan(curr.getTime());
    }
  });
});

// ─── groupTransactionsByDate ──────────────────────────────────────────────────

describe('groupTransactionsByDate', () => {
  const txs: Transaction[] = [
    { id: '1', date: '2026-05-12', amount: 100, type: 'expense', categoryId: 'food', createdAt: '' },
    { id: '2', date: '2026-05-12', amount: 50,  type: 'income',  categoryId: 'salary', createdAt: '' },
    { id: '3', date: '2026-05-10', amount: 200, type: 'expense', categoryId: 'rent', createdAt: '' },
  ];

  test('groups transactions by formatted date', () => {
    const groups = groupTransactionsByDate(txs, 'DD/MM/YYYY');
    expect(groups).toHaveLength(2);
  });

  test('groups are sorted ascending by date', () => {
    const groups = groupTransactionsByDate(txs, 'DD/MM/YYYY');
    expect(groups[0].date).toBe('2026-05-10');
    expect(groups[1].date).toBe('2026-05-12');
  });

  test('same-date transactions are grouped together', () => {
    const groups = groupTransactionsByDate(txs, 'DD/MM/YYYY');
    const may12 = groups.find(g => g.label === '12/05/2026');
    expect(may12?.transactions).toHaveLength(2);
  });

  test('empty array returns empty result', () => {
    expect(groupTransactionsByDate([], 'DD/MM/YYYY')).toHaveLength(0);
  });
});
