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