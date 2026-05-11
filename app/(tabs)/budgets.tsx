import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { openDatabase } from '../../db/migrations';
import { useBudgetStore } from '../../stores/budgetStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { CATEGORIES, getCategoryById } from '../../constants/categories';
import BudgetProgressBar from '../../components/BudgetProgressBar';
import NumPad from '../../components/NumPad';
import { DARK_COLORS as C, SPACING, TYPOGRAPHY as T, RADIUS } from '../../constants/theme';

const db = openDatabase();

export default function BudgetsScreen() {
  const { budgets, loadBudgets, addBudget, updateBudget, deleteBudget, getBudgetProgress } = useBudgetStore();
  const { transactions, loadTransactions } = useTransactionStore();
  const { getCurrencySymbol, loadSettings } = useSettingsStore();

  const [addModal, setAddModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState('food');
  const [amount, setAmount] = useState('');
  const [numPadVisible, setNumPadVisible] = useState(false);

  useEffect(() => {
    loadSettings(db);
    loadBudgets(db);
    loadTransactions(db);
  }, []);

  const currencySymbol = getCurrencySymbol();
  const expenseCategories = CATEGORIES.filter(c => c.type === 'expense' || c.type === 'both');

  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => {
    const progress = getBudgetProgress(b.categoryId, transactions);
    return s + progress.spent;
  }, 0);
  const globalPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const handleSave = () => {
    const limit = parseFloat(amount);
    if (!limit || limit <= 0) { Alert.alert('Erreur', 'Montant invalide'); return; }
    if (editId) {
      updateBudget(db, editId, limit);
    } else {
      addBudget(db, { categoryId: selectedCat, limit, month: undefined });
    }
    setAddModal(false);
    setAmount('');
    setEditId(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé mensuel</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{currencySymbol} {totalSpent.toLocaleString('fr-FR')}</Text>
              <Text style={styles.summaryLabel}>Dépensé</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{currencySymbol} {totalBudget.toLocaleString('fr-FR')}</Text>
              <Text style={styles.summaryLabel}>Budget total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: globalPercent >= 80 ? C.danger : C.accent2 }]}>
                {globalPercent}%
              </Text>
              <Text style={styles.summaryLabel}>Consommé</Text>
            </View>
          </View>
        </View>

        {/* Budget list */}
        {budgets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyText}>Aucun budget défini</Text>
            <Text style={styles.emptyHint}>Appuyez sur + pour créer votre premier budget</Text>
          </View>
        ) : (
          budgets.map(budget => {
            const progress = getBudgetProgress(budget.categoryId, transactions);
            const cat = getCategoryById(budget.categoryId);
            return (
              <View key={budget.id} style={styles.budgetItem}>
                <BudgetProgressBar
                  spent={progress.spent}
                  limit={budget.limit}
                  label={cat?.name ?? budget.categoryId}
                  icon={cat?.icon ?? '📌'}
                  currencySymbol={currencySymbol}
                  onPress={() => {
                    setEditId(budget.id);
                    setAmount(String(budget.limit));
                    setAddModal(true);
                  }}
                />
              </View>
            );
          })
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { setEditId(null); setAmount(''); setAddModal(true); }}>
        <Feather name="plus" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setAddModal(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{editId ? 'Modifier le budget' : 'Nouveau budget'}</Text>

          {!editId && (
            <View style={styles.catGrid}>
              {expenseCategories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCat(cat.id)}
                  style={[styles.catChip, selectedCat === cat.id && styles.catChipActive]}
                >
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <Text style={[styles.catLabel, selectedCat === cat.id && { color: '#FFF' }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.amountDisplay} onPress={() => setNumPadVisible(true)}>
            <Text style={styles.amountText}>{amount || '0'} {getCurrencySymbol()}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          </TouchableOpacity>

          {editId && (
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: C.danger, marginTop: SPACING.sm }]}
              onPress={() => {
                Alert.alert('Supprimer', 'Supprimer ce budget ?', [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Supprimer', style: 'destructive', onPress: () => { deleteBudget(db, editId!); setAddModal(false); } },
                ]);
              }}
            >
              <Text style={styles.saveBtnText}>Supprimer le budget</Text>
            </TouchableOpacity>
          )}
        </View>

        <NumPad
          value={amount}
          onValueChange={setAmount}
          onConfirm={() => setNumPadVisible(false)}
          visible={numPadVisible}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.lg },
  summaryCard: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg },
  summaryTitle: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md, color: C.text, marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontFamily: 'SpaceMono-Regular', fontSize: T.sizes.lg, color: C.text },
  summaryLabel: { fontFamily: T.fonts.body, fontSize: T.sizes.xs, color: C.text2, marginTop: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.lg, color: C.text2 },
  emptyHint: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.text3, marginTop: SPACING.xs, textAlign: 'center' },
  budgetItem: { marginBottom: SPACING.sm },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 28, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', elevation: 8,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.xl, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: C.surface3, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg },
  sheetTitle: { fontFamily: T.fonts.semibold, fontSize: T.sizes.xl, color: C.text, marginBottom: SPACING.lg },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    backgroundColor: C.surface2, borderRadius: RADIUS.full, minWidth: 80,
  },
  catChipActive: { backgroundColor: C.accent },
  catIcon: { fontSize: 16 },
  catLabel: { fontFamily: T.fonts.body, fontSize: T.sizes.xs, color: C.text2 },
  amountDisplay: {
    backgroundColor: C.surface2, borderRadius: RADIUS.md, padding: SPACING.lg,
    alignItems: 'center', marginBottom: SPACING.lg,
  },
  amountText: { fontFamily: 'SpaceMono-Regular', fontSize: T.sizes.xxl, color: C.text },
  saveBtn: { backgroundColor: C.accent, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  saveBtnText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md, color: '#FFF' },
});
