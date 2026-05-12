import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  TextInput, ScrollView, Modal, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { openDatabase } from '../../db/migrations';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { CATEGORIES, getCategoryById } from '../../constants/categories';
import TransactionItem from '../../components/TransactionItem';
import PeriodSelector from '../../components/PeriodSelector';
import { Transaction } from '../../db/schema';
import { getPeriodDates } from '../../services/periodFilter';
import { DARK_COLORS as C, SPACING, TYPOGRAPHY as T, RADIUS } from '../../constants/theme';
import type { PeriodFilterType } from '../../db/schema';

const db = openDatabase();

type FilterType = 'all' | 'income' | 'expense';

function groupByDate(transactions: Transaction[]): { title: string; data: Transaction[] }[] {
  const groups: Record<string, Transaction[]> = {};
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  for (const tx of transactions) {
    if (!groups[tx.date]) groups[tx.date] = [];
    groups[tx.date].push(tx);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => {
      const d = new Date(date + 'T12:00:00');
      const label = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      return { title: label, data };
    });
}

const EXPENSE_CATEGORIES = CATEGORIES.filter(c => c.type === 'expense' || c.type === 'both');
const INCOME_CATEGORIES = CATEGORIES.filter(c => c.type === 'income' || c.type === 'both');

export default function TransactionsScreen() {
  const router = useRouter();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilterType>('month');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { transactions, loadTransactions, deleteTransaction } = useTransactionStore();
  const { getCurrencySymbol, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings(db);
    loadTransactions(db);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions(db);
    setTimeout(() => setRefreshing(false), 0);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(text), 250);
  }, []);

  const { startDate, endDate } = useMemo(() => {
    if (filterPeriod === 'all') return { startDate: null, endDate: null };
    return getPeriodDates(filterPeriod as any);
  }, [filterPeriod]);

  const filtered = useMemo(() => {
    let result = [...transactions];
    if (filterPeriod !== 'all' && startDate && endDate) {
      result = result.filter(t => t.date >= startDate && t.date <= endDate);
    }
    if (filterType !== 'all') result = result.filter(t => t.type === filterType);
    if (filterCategory) result = result.filter(t => t.categoryId === filterCategory);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(t => {
        const cat = getCategoryById(t.categoryId);
        return (t.note?.toLowerCase().includes(q) || cat?.name.toLowerCase().includes(q));
      });
    }
    return result;
  }, [transactions, filterPeriod, filterType, filterCategory, debouncedSearch, startDate, endDate]);

  const sections = useMemo(() => groupByDate(filtered), [filtered]);
  const currencySymbol = getCurrencySymbol();

  const totalFiltered = useMemo(() => {
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  const categoryOptions = useMemo(() => {
    if (filterType === 'income') return INCOME_CATEGORIES;
    if (filterType === 'expense') return EXPENSE_CATEGORIES;
    return CATEGORIES.filter(c => c.isActive);
  }, [filterType]);

  const handleDelete = () => {
    if (!selectedTx) return;
    Alert.alert('Supprimer', 'Confirmer la suppression de cette transaction ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: () => {
          deleteTransaction(db, selectedTx.id);
          setSelectedTx(null);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color={C.text3} style={{ marginRight: SPACING.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          placeholderTextColor={C.text3}
          value={search}
          onChangeText={handleSearchChange}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
            <Feather name="x" size={16} color={C.text3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Period filter */}
      <PeriodSelector
        selected={filterPeriod}
        onSelect={(p) => { setFilterPeriod(p); setFilterCategory(null); }}
        showAll
      />

      {/* Type filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {(['all', 'expense', 'income'] as FilterType[]).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => { setFilterType(f); setFilterCategory(null); }}
            style={[styles.chip, filterType === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, filterType === f && styles.chipTextActive]}>
              {f === 'all' ? 'Tout' : f === 'expense' ? 'Dépenses' : 'Revenus'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.chipSeparator} />
        {categoryOptions.map(cat => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
            style={[styles.chip, filterCategory === cat.id && { backgroundColor: cat.color + '55' }]}
          >
            <Text style={styles.chipIcon}>{cat.icon}</Text>
            <Text style={[styles.chipText, filterCategory === cat.id && { color: cat.color }]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryCount}>{filtered.length} opération{filtered.length !== 1 ? 's' : ''}</Text>
        <View style={styles.summaryAmounts}>
          {totalFiltered.income > 0 && (
            <Text style={[styles.summaryAmount, { color: C.accent2 }]}>
              +{totalFiltered.income.toLocaleString('fr-FR')} {currencySymbol}
            </Text>
          )}
          {totalFiltered.expense > 0 && (
            <Text style={[styles.summaryAmount, { color: C.danger }]}>
              -{totalFiltered.expense.toLocaleString('fr-FR')} {currencySymbol}
            </Text>
          )}
        </View>
      </View>

      {/* List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        renderSectionHeader={({ section }) => {
          const dayIncome = section.data.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const dayExpense = section.data.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          const dayNet = dayIncome - dayExpense;
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={[styles.sectionNet, { color: dayNet >= 0 ? C.accent2 : C.danger }]}>
                {dayNet >= 0 ? '+' : ''}{dayNet.toLocaleString('fr-FR')} {currencySymbol}
              </Text>
            </View>
          );
        }}
        renderItem={({ item }) => {
          const cat = getCategoryById(item.categoryId);
          return cat ? (
            <TransactionItem
              transaction={item}
              category={cat}
              currencySymbol={currencySymbol}
              onPress={() => setSelectedTx(item)}
            />
          ) : null;
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucune transaction trouvée</Text>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add')}>
        <Feather name="plus" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTx(null)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedTx(null)} />
        <View style={styles.bottomSheet}>
          {selectedTx && (
            <>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>
                {selectedTx.note || getCategoryById(selectedTx.categoryId)?.name}
              </Text>
              <Text style={styles.sheetAmount}>
                {selectedTx.type === 'expense' ? '−' : '+'}{currencySymbol} {selectedTx.amount.toLocaleString('fr-FR')}
              </Text>
              <Text style={styles.sheetDate}>
                {new Date(selectedTx.date + 'T12:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </Text>
              <TouchableOpacity
                style={styles.sheetBtn}
                onPress={() => {
                  setSelectedTx(null);
                  router.push({ pathname: '/add', params: { txId: selectedTx.id } });
                }}
              >
                <Feather name="edit-2" size={18} color={C.accent} />
                <Text style={[styles.sheetBtnText, { color: C.accent }]}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetBtn} onPress={handleDelete}>
                <Feather name="trash-2" size={18} color={C.danger} />
                <Text style={[styles.sheetBtnText, { color: C.danger }]}>Supprimer</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    margin: SPACING.lg, marginBottom: SPACING.sm, paddingHorizontal: SPACING.md,
    backgroundColor: C.surface2, borderRadius: RADIUS.md, height: 44,
  },
  searchInput: {
    flex: 1, fontFamily: T.fonts.body, fontSize: T.sizes.md,
    color: C.text, height: 44,
  },
  filters: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full, backgroundColor: C.surface2, marginRight: SPACING.xs, height: 32,
    alignSelf: 'flex-start',
  },
  chipActive: { backgroundColor: C.accent },
  chipText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.sm, color: C.text2 },
  chipTextActive: { color: '#FFF' },
  chipIcon: { fontSize: 12, marginRight: 3 },
  chipSeparator: { width: 1, backgroundColor: C.surface3, marginHorizontal: SPACING.xs, height: 20, alignSelf: 'center' },
  summaryBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs,
    borderBottomWidth: 1, borderBottomColor: C.surface2,
  },
  summaryCount: { fontFamily: T.fonts.body, fontSize: T.sizes.xs, color: C.text3 },
  summaryAmounts: { flexDirection: 'row', gap: SPACING.sm },
  summaryAmount: { fontFamily: 'SpaceMono-Regular', fontSize: T.sizes.xs },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs, backgroundColor: C.bg },
  sectionTitle: { fontFamily: T.fonts.semibold, fontSize: T.sizes.sm, color: C.text2 },
  sectionNet: { fontFamily: 'SpaceMono-Regular', fontSize: T.sizes.xs },
  empty: { textAlign: 'center', color: C.text2, fontFamily: T.fonts.body, padding: SPACING.xl },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 8,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  bottomSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.xl, paddingBottom: 40, minHeight: 200,
  },
  handle: {
    width: 40, height: 4, backgroundColor: C.surface3,
    borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg,
  },
  sheetTitle: { fontFamily: T.fonts.semibold, fontSize: T.sizes.lg, color: C.text, marginBottom: SPACING.xs },
  sheetAmount: { fontFamily: 'SpaceMono-Regular', fontSize: T.sizes.xl, color: C.accent2, marginBottom: SPACING.xs },
  sheetDate: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.text2, marginBottom: SPACING.lg },
  sheetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: C.surface2,
  },
  sheetBtnText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md },
});
