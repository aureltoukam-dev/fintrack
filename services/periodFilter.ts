import { Transaction } from '../db/schema';

const getDayOfWeek = (date: Date): number => {
  return date.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
};

const getStartOfWeek = (date: Date): Date => {
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday is 1, Sunday is 0. Adjust for Sunday being 0.
  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getStartOfMonth = (date: Date): Date => {
  const monthStart = new Date(date);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
};

const getStartOfQuarter = (date: Date): Date => {
  const month = date.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const quarterStart = new Date(date.getFullYear(), quarterStartMonth, 1);
  quarterStart.setHours(0, 0, 0, 0);
  return quarterStart;
};

const getStartOfYear = (date: Date): Date => {
  const yearStart = new Date(date.getFullYear(), 0, 1);
  yearStart.setHours(0, 0, 0, 0);
  return yearStart;
};

const formatDateISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getPeriodDates = (
  period: 'week' | 'month' | 'quarter' | 'year' | 'custom',
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string } => {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of the day for endDate

  let startDate: Date;
  let endDate: Date;
  let label: string;

  switch (period) {
    case 'week':
      startDate = getStartOfWeek(new Date());
      endDate = today;
      label = 'CETTE SEMAINE';
      break;
    case 'month':
      startDate = getStartOfMonth(new Date());
      endDate = today;
      label = 'CE MOIS';
      break;
    case 'quarter':
      startDate = getStartOfQuarter(new Date());
      endDate = today;
      label = 'CE TRIMESTRE';
      break;
    case 'year':
      startDate = getStartOfYear(new Date());
      endDate = today;
      label = 'CETTE ANNÉE';
      break;
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom start and end dates are required for custom period.');
      }
      // Assuming customStart and customEnd are in 'YYYY-MM-DD' format
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999); // Ensure end date is inclusive
      // Format for label: DD/MM
      const startDay = startDate.getDate().toString().padStart(2, '0');
      const startMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');
      label = `DU ${startDay}/${startMonth}`;
      const endDay = endDate.getDate().toString().padStart(2, '0');
      const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
      label += ` AU ${endDay}/${endMonth}`;
      break;
    default:
      throw new Error(`Unknown period type: ${period}`);
  }

  return {
    startDate: formatDateISO(startDate),
    endDate: formatDateISO(endDate),
    label,
  };
};

const MONTH_LABELS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
export const MONTH_FULL = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export const getLast6Months = (): { monthNum: string; year: number; label: string }[] => {
  const result = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    result.push({
      monthNum: String(d.getMonth() + 1).padStart(2, '0'),
      year: d.getFullYear(),
      label: MONTH_LABELS[d.getMonth()],
    });
  }
  return result;
};

export type BarSlice = { label: string; start: string; end: string };

export const getBarSlicesForPeriod = (period: 'week' | 'month' | 'quarter' | 'year'): BarSlice[] => {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === 'week') {
    const start = getStartOfWeek(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dayLabels = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
      return { label: dayLabels[i], start: iso(d), end: iso(d) };
    });
  }

  if (period === 'month') {
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const slices: BarSlice[] = [];
    for (let w = 0; w < 5; w++) {
      const dayStart = w * 7 + 1;
      if (dayStart > daysInMonth) break;
      const dayEnd = Math.min(dayStart + 6, daysInMonth);
      const s = new Date(year, month, dayStart);
      const e = new Date(year, month, dayEnd);
      slices.push({ label: `S${w + 1}`, start: iso(s), end: iso(e) });
    }
    return slices;
  }

  if (period === 'quarter') {
    const quarterStart = getStartOfQuarter(today);
    const startMonth = quarterStart.getMonth();
    return [0, 1, 2].map(i => {
      const s = new Date(quarterStart.getFullYear(), startMonth + i, 1);
      const e = new Date(quarterStart.getFullYear(), startMonth + i + 1, 0);
      return { label: MONTH_LABELS[s.getMonth()], start: iso(s), end: iso(e) };
    });
  }

  // year: 12 months
  return Array.from({ length: 12 }, (_, i) => {
    const s = new Date(today.getFullYear(), i, 1);
    const e = new Date(today.getFullYear(), i + 1, 0);
    return { label: MONTH_LABELS[i], start: iso(s), end: iso(e) };
  });
};

export const formatDate = (dateString: string, format: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  let formattedDate = format;
  formattedDate = formattedDate.replace('YYYY', year.toString());
  formattedDate = formattedDate.replace('MM', month);
  formattedDate = formattedDate.replace('DD', day);
  formattedDate = formattedDate.replace('HH', hours);
  formattedDate = formattedDate.replace('mm', minutes);

  return formattedDate;
};

export const formatCurrency = (amount: number, currency: string, locale: string): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Navigate to a specific period by offset (0 = current, -1 = previous, etc.)
export const getOffsetPeriodDates = (
  period: 'week' | 'month' | 'quarter' | 'year',
  offset: number
): { startDate: string; endDate: string; label: string; monthKey: string } => {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === 'week') {
    const start = getStartOfWeek(today);
    start.setDate(start.getDate() + offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const s = start, e = end;
    const label = s.getMonth() === e.getMonth()
      ? `${s.getDate()} – ${e.getDate()} ${MONTH_FULL[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`
      : `${s.getDate()} ${MONTH_FULL[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTH_FULL[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;
    return { startDate: iso(start), endDate: iso(end), label, monthKey: `${end.getFullYear()}-${pad(end.getMonth() + 1)}` };
  }

  if (period === 'month') {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const label = `${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;
    const monthKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    return { startDate: iso(start), endDate: iso(end), label, monthKey };
  }

  if (period === 'quarter') {
    const currentQ = Math.floor(today.getMonth() / 3);
    const totalQ = today.getFullYear() * 4 + currentQ + offset;
    const targetYear = Math.floor(totalQ / 4);
    const q = ((totalQ % 4) + 4) % 4;
    const startMonth = q * 3;
    const start = new Date(targetYear, startMonth, 1);
    const end = new Date(targetYear, startMonth + 3, 0);
    const label = `T${q + 1} ${targetYear}`;
    return { startDate: iso(start), endDate: iso(end), label, monthKey: `${targetYear}-${pad(startMonth + 1)}` };
  }

  // year
  const targetYear = today.getFullYear() + offset;
  const start = new Date(targetYear, 0, 1);
  const end = new Date(targetYear, 11, 31);
  return { startDate: iso(start), endDate: iso(end), label: String(targetYear), monthKey: `${targetYear}-01` };
};

export const groupTransactionsByDate = (
  transactions: Transaction[],
  dateFormat: string
): { date: string; label: string; transactions: Transaction[] }[] => {
  const grouped: { [key: string]: Transaction[] } = {};

  transactions.forEach((transaction) => {
    const transactionDate = new Date(transaction.date);
    const formattedDate = formatDate(transaction.date, dateFormat);
    if (!grouped[formattedDate]) {
      grouped[formattedDate] = [];
    }
    grouped[formattedDate].push(transaction);
  });

  const result: { date: string; label: string; transactions: Transaction[] }[] = [];
  Object.keys(grouped).forEach((dateLabel) => {
    // We need to find the original date string for the label to be accurate if dateFormat is complex
    // For simplicity, if dateFormat is 'DD/MM/YYYY', we can reconstruct it.
    // If dateFormat is just 'DD/MM', we might need to store the original date.
    // For now, let's assume dateFormat is simple enough or we can infer the date.
    // A more robust solution would involve mapping formattedDate back to the original date string.
    // For this example, we'll use the formattedDate as the 'date' field and the label.
    // If the original date string is needed, it should be passed or derived.

    // Let's assume dateFormat is 'YYYY-MM-DD' for simplicity in this example to get the original date.
    // If dateFormat is different, this part needs adjustment.
    const originalDateString = transactions.find(t => formatDate(t.date, dateFormat) === dateLabel)?.date;

    result.push({
      date: originalDateString || dateLabel, // Use original date if found, otherwise the formatted label
      label: dateLabel,
      transactions: grouped[dateLabel],
    });
  });

  // Sort by date
  result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return result;
};