import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Transaction, Budget, Category } from '../db/schema'; // Assuming these types are defined elsewhere
import { SQLiteDatabase } from 'expo-sqlite'; // Assuming you are using expo-sqlite

const getTimestamp = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const exportToJSON = async (
  transactions: Transaction[],
  budgets: Budget[],
  settings: Record<string, string>
): Promise<void> => {
  const filename = `fintrack-backup-${getTimestamp()}.json`;
  const data = JSON.stringify({ transactions, budgets, settings }, null, 2);

  try {
    await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + filename, data, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const uri = FileSystem.documentDirectory + filename;

    if (!(await Sharing.isAvailableAsync())) {
      alert(`Sharing isn't available on your platform`);
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: `Share FinTrack Backup (${filename})`,
    });

    // Optionally, delete the file after sharing if you don't want to keep it locally
    // await FileSystem.deleteAsync(uri);

  } catch (error) {
    console.error('Error exporting to JSON:', error);
    throw error;
  }
};

export const importFromJSON = async (db: SQLiteDatabase): Promise<{ transactions: number; budgets: number }> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { transactions: 0, budgets: 0 };
    }

    const fileUri = result.assets[0].uri;
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const importedData = JSON.parse(fileContent);

    // Basic validation of structure
    if (!importedData || !Array.isArray(importedData.transactions) || !Array.isArray(importedData.budgets)) {
      throw new Error('Invalid file structure. Expected JSON with "transactions" and "budgets" arrays.');
    }

    let importedTransactionsCount = 0;
    let importedBudgetsCount = 0;

    // Import transactions
    for (const transaction of importedData.transactions) {
      db.runSync(
        'INSERT OR REPLACE INTO transactions (id, date, amount, type, categoryId, note, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [transaction.id, transaction.date, transaction.amount, transaction.type, transaction.categoryId, transaction.note ?? null, transaction.createdAt ?? new Date().toISOString(), transaction.updatedAt ?? null]
      );
      importedTransactionsCount++;
    }

    // Import budgets
    for (const budget of importedData.budgets) {
      db.runSync(
        'INSERT OR REPLACE INTO budgets (id, categoryId, limit_amount, month) VALUES (?, ?, ?, ?)',
        [budget.id, budget.categoryId, budget.limit_amount ?? budget.amount, budget.month ?? null]
      );
      importedBudgetsCount++;
    }

    // Import settings if they exist and you have a way to handle them
    if (importedData.settings && typeof importedData.settings === 'object') {
      // Handle settings import logic here
      console.log('Imported settings:', importedData.settings);
    }

    return { transactions: importedTransactionsCount, budgets: importedBudgetsCount };

  } catch (error) {
    console.error('Error importing from JSON:', error);
    throw error;
  }
};

export const exportToCSV = async (
  transactions: Transaction[],
  categories: Category[] // Assuming categories are needed to map categoryId to name if required, but format doesn't ask for it.
): Promise<void> => {
  const filename = `fintrack-export-${getTimestamp()}.csv`;
  const csvRows = [];

  // Header
  csvRows.push('date,montant,type,categoryId,note');

  // Data rows
  transactions.forEach((transaction) => {
    const escapedNote = transaction.note ? `"${transaction.note.replace(/"/g, '""')}"` : ''; // Escape quotes in note
    csvRows.push(`${transaction.date},${transaction.amount},${transaction.type},${transaction.categoryId},${escapedNote}`);
  });

  const csvString = csvRows.join('\n');

  try {
    await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + filename, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const uri = FileSystem.documentDirectory + filename;

    if (!(await Sharing.isAvailableAsync())) {
      alert(`Sharing isn't available on your platform`);
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      dialogTitle: `Share FinTrack Export (${filename})`,
    });

    // Optionally, delete the file after sharing
    // await FileSystem.deleteAsync(uri);

  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
};