import * as SQLite from 'expo-sqlite';

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const isoDate = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

export const seedDatabase = (db: SQLite.SQLiteDatabase) => {
  const already = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions'
  );
  if (already && already.count > 0) return; // ne seed qu'une seule fois

  // --- TRANSACTIONS (3 mois de données fictives) ---
  const transactions: [string, string, number, string, string, string, string][] = [
    // Revenus
    [uuid(), isoDate(85), 350000, 'income', 'salary',    'Salaire mars',         new Date().toISOString()],
    [uuid(), isoDate(55), 350000, 'income', 'salary',    'Salaire avril',        new Date().toISOString()],
    [uuid(), isoDate(25), 350000, 'income', 'salary',    'Salaire mai',          new Date().toISOString()],
    [uuid(), isoDate(70), 45000,  'income', 'freelance', 'Mission design UI',    new Date().toISOString()],
    [uuid(), isoDate(40), 30000,  'income', 'freelance', 'Développement site',   new Date().toISOString()],
    [uuid(), isoDate(10), 20000,  'income', 'transfer',  'Remboursement ami',    new Date().toISOString()],
    // Alimentation
    [uuid(), isoDate(83), 8500,   'expense', 'food',      'Marché central',      new Date().toISOString()],
    [uuid(), isoDate(80), 3200,   'expense', 'food',      'Supermarché Mahima',  new Date().toISOString()],
    [uuid(), isoDate(76), 1500,   'expense', 'food',      'Restaurant midi',     new Date().toISOString()],
    [uuid(), isoDate(70), 9800,   'expense', 'food',      'Courses semaine',     new Date().toISOString()],
    [uuid(), isoDate(63), 4200,   'expense', 'food',      'Boulangerie',         new Date().toISOString()],
    [uuid(), isoDate(55), 8000,   'expense', 'food',      'Marché central',      new Date().toISOString()],
    [uuid(), isoDate(48), 2500,   'expense', 'food',      'Café & snacks',       new Date().toISOString()],
    [uuid(), isoDate(42), 11000,  'expense', 'food',      'Courses hebdo',       new Date().toISOString()],
    [uuid(), isoDate(35), 3800,   'expense', 'food',      'Resto en famille',    new Date().toISOString()],
    [uuid(), isoDate(28), 7500,   'expense', 'food',      'Marché Mokolo',       new Date().toISOString()],
    [uuid(), isoDate(21), 2900,   'expense', 'food',      'Snacks bureau',       new Date().toISOString()],
    [uuid(), isoDate(14), 9200,   'expense', 'food',      'Courses semaine',     new Date().toISOString()],
    [uuid(), isoDate(7),  4100,   'expense', 'food',      'Supermarché',         new Date().toISOString()],
    [uuid(), isoDate(2),  1800,   'expense', 'food',      'Déjeuner work',       new Date().toISOString()],
    // Transport
    [uuid(), isoDate(82), 5000,   'expense', 'transport', 'Taxi moto × 10',     new Date().toISOString()],
    [uuid(), isoDate(74), 12000,  'expense', 'transport', 'Carburant voiture',   new Date().toISOString()],
    [uuid(), isoDate(60), 4500,   'expense', 'transport', 'Taxi moto × 9',      new Date().toISOString()],
    [uuid(), isoDate(46), 15000,  'expense', 'transport', 'Carburant + lavage',  new Date().toISOString()],
    [uuid(), isoDate(30), 5000,   'expense', 'transport', 'Taxi moto × 10',     new Date().toISOString()],
    [uuid(), isoDate(15), 13000,  'expense', 'transport', 'Carburant',           new Date().toISOString()],
    [uuid(), isoDate(5),  3500,   'expense', 'transport', 'Taxi moto × 7',      new Date().toISOString()],
    // Logement
    [uuid(), isoDate(84), 80000,  'expense', 'housing',   'Loyer mars',         new Date().toISOString()],
    [uuid(), isoDate(54), 80000,  'expense', 'housing',   'Loyer avril',        new Date().toISOString()],
    [uuid(), isoDate(24), 80000,  'expense', 'housing',   'Loyer mai',          new Date().toISOString()],
    [uuid(), isoDate(60), 8500,   'expense', 'housing',   'Électricité AES',    new Date().toISOString()],
    [uuid(), isoDate(30), 7200,   'expense', 'housing',   'Électricité AES',    new Date().toISOString()],
    [uuid(), isoDate(65), 3000,   'expense', 'housing',   'Eau CAMWATER',        new Date().toISOString()],
    [uuid(), isoDate(35), 3000,   'expense', 'housing',   'Eau CAMWATER',        new Date().toISOString()],
    // Télécoms
    [uuid(), isoDate(81), 5000,   'expense', 'telecom',   'Forfait MTN 10 Go',  new Date().toISOString()],
    [uuid(), isoDate(51), 5000,   'expense', 'telecom',   'Forfait MTN 10 Go',  new Date().toISOString()],
    [uuid(), isoDate(21), 5000,   'expense', 'telecom',   'Forfait MTN 10 Go',  new Date().toISOString()],
    [uuid(), isoDate(75), 2000,   'expense', 'telecom',   'Crédit Orange',      new Date().toISOString()],
    // Santé
    [uuid(), isoDate(72), 15000,  'expense', 'health',    'Consultation médecin', new Date().toISOString()],
    [uuid(), isoDate(71), 8500,   'expense', 'health',    'Pharmacie',           new Date().toISOString()],
    [uuid(), isoDate(33), 5000,   'expense', 'health',    'Pharmacie routine',   new Date().toISOString()],
    // Loisirs
    [uuid(), isoDate(78), 10000,  'expense', 'leisure',   'Cinéma Canal+',      new Date().toISOString()],
    [uuid(), isoDate(50), 25000,  'expense', 'leisure',   'Sortie weekend',     new Date().toISOString()],
    [uuid(), isoDate(18), 15000,  'expense', 'leisure',   'Sport & fitness',    new Date().toISOString()],
    // Éducation
    [uuid(), isoDate(86), 50000,  'expense', 'education', 'Frais scolarité',    new Date().toISOString()],
    [uuid(), isoDate(20), 7500,   'expense', 'education', 'Livres & fournitures', new Date().toISOString()],
    // Vêtements
    [uuid(), isoDate(45), 35000,  'expense', 'clothing',  'Vêtements marché',   new Date().toISOString()],
    [uuid(), isoDate(12), 18000,  'expense', 'clothing',  'Chaussures',         new Date().toISOString()],
  ];

  for (const [id, date, amount, type, categoryId, note, createdAt] of transactions) {
    db.runSync(
      'INSERT OR IGNORE INTO transactions (id, date, amount, type, categoryId, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, date, amount, type, categoryId, note, createdAt]
    );
  }

  // --- BUDGETS mensuels ---
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const budgets: [string, string, number][] = [
    ['food',      'Alimentation',  60000],
    ['transport', 'Transport',     30000],
    ['housing',   'Logement',     100000],
    ['telecom',   'Télécoms',      15000],
    ['health',    'Santé',         20000],
    ['leisure',   'Loisirs',       30000],
    ['education', 'Éducation',     60000],
    ['clothing',  'Vêtements',     25000],
  ];

  for (const [categoryId, , limit_amount] of budgets) {
    db.runSync(
      'INSERT OR IGNORE INTO budgets (id, categoryId, limit_amount, month) VALUES (?, ?, ?, ?)',
      [uuid(), categoryId, limit_amount, currentMonth]
    );
  }
};
