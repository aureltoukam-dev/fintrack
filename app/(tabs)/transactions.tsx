import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { openDatabase } from '../../db/migrations';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { CATEGORIES, getCategoryById } from '../../constants/categories';
import TransactionItem from '../../components/TransactionItem';
import PeriodNavigator from '../../components/PeriodNavigator';
import { Transaction } from '../../db/schema';
import { getOffsetPeriodDates } from '../../services/periodFilter';
import { useTheme, SPACING, TYPOGRAPHY as T, RADIUS } from '../../constants/theme';
import type { PeriodFilterType } from '../../db/schema';

const db = openDatabase();
const PAGE_SIZE = 50;

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
      return { title: `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`, data };
    });
}

export default function TransactionsScreen() {
  const C = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    searchRow: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.xs,
      paddingHorizontal: SPACING.md, backgroundColor: C.surface2,
      borderRadius: RADIUS.md, height: 42,
    },
    searchInput: { flex: 1, fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.text, height: 42 },
    filterRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xs, gap: SPACING.xs,
    },
    typeChip: {
      paddingHorizontal: SPACING.md, paddingVertical: 6,
      borderRadius: RADIUS.full, backgroundColor: C.surface2,
    },
    typeChipActive: { backgroundColor: C.accent },
    typeChipText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.xs, color: C.text2 },
    typeChipTextActive: { color: '#FFF' },
    catChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: SPACING.sm, paddingVertical: 6,
      borderRadius: RADIUS.full, backgroundColor: C.surface2,
      maxWidth: 140,
    },
    catChipText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.xs, color: C.text2, flexShrink: 1 },
    filterBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: SPACING.sm, paddingVertical: 6,
      borderRadius: RADIUS.full, backgroundColor: C.surface2,
      marginLeft: 'auto' as any,
    },
    filterBtnText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.xs, color: C.text2 },
    divider: { width: 1, height: 16, backgroundColor: C.surface3, marginHorizontal: 2 },
    summaryBar: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs,
      borderBottomWidth: 1, borderBottomColor: C.surface2,
    },
    summaryCount: { fontFamily: T.fonts.body, fontSize: 11, color: C.text3 },
    summaryAmounts: { flexDirection: 'row', gap: SPACING.sm },
    summaryAmount: { fontFamily: 'SpaceMono-Regular', fontSize: 11 },
    sectionHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs, backgroundColor: C.bg,
    },
    sectionTitle: { fontFamily: T.fonts.semibold, fontSize: T.sizes.sm, color: C.text2 },
    sectionNet: { fontFamily: 'SpaceMono-Regular', fontSize: T.sizes.xs },
    empty: { textAlign: 'center', color: C.text2, fontFamily: T.fonts.body, padding: SPACING.xl },
    fab: {
      position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
      borderRadius: 28, backgroundColor: C.accent,
      alignItems: 'center', justifyContent: 'center', elevation: 8,
      shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 8,
    },
    // Category picker modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    catSheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.xl, paddingBottom: 40 },
    handle: { width: 40, height: 4, backgroundColor: C.surface3, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg },
    sheetTitle: { fontFamily: T.fonts.semibold, fontSize: T.sizes.lg, color: C.text, marginBottom: SPACING.md },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    catGridItem: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
      paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full, backgroundColor: C.surface2,
    },
    catGridItemActive: { backgroundColor: C.accent + '33' },
    catGridText: { fontFamily: T.fonts.body, fontSize: T.sizes.xs, color: C.text2 },
    // Transaction detail
    bottomSheet: {
      backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: SPACING.xl, paddingBottom: 40, minHeight: 200,
    },
    sheetAmount: { fontFamily: 'SpaceMono-Regular', fontSize: T.sizes.xl, color: C.accent2, marginBottom: SPACING.xs },
    sheetDate: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.text2, marginBottom: SPACING.lg },
    sheetBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: C.surface2 },
    sheetBtnText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md },
    loadMoreBtn: { alignItems: 'center', padding: SPACING.lg, marginBottom: 80 },
    loadMoreText: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.accent },
  }), [C]);

  const router = useRouter();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [periodType, setPeriodType] = useState<PeriodFilterType>('month');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { transactions, loadTransactions, deleteTransaction } = useTransactionStore();
  const { getCurrencySymbol, loadSettings } = useSettingsStore();

  useEffect(() => { loadSettings(db); loadTransactions(db); }, []);

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

  const { startDate, endDate, label: periodLabel } = useMemo(() => {
    if (periodType === 'all') return { startDate: null, endDate: null, label: 'Tout' };
    return getOffsetPeriodDates(periodType as any, periodOffset);
  }, [periodType, periodOffset]);

  const filtered = useMemo(() => {
    let result = [...transactions];
    if (periodType !== 'all' && startDate && endDate) {
      result = result.filter(t => t.date >= startDate && t.date <= endDate);
    }
    if (filterType !== 'all') result = result.filter(t => t.type === filterType);
    if (filterCategory) result = result.filter(t => t.categoryId === filterCategory);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(t => {
        const cat = getCategoryById(t.categoryId);
        return t.note?.toLowerCase().includes(q) || cat?.name.toLowerCase().includes(q);
      });
    }
    return result;
  }, [transactions, periodType, filterType, filterCategory, debouncedSearch, startDate, endDate]);

  const paginatedFiltered = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const sections = useMemo(() => groupByDate(paginatedFiltered), [paginatedFiltered]);
  const hasMore = filtered.length > visibleCount;
  const currencySymbol = getCurrencySymbol();

  const totalFiltered = useMemo(() => {
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [filtered]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [periodType, periodOffset, filterType, filterCategory, debouncedSearch]);

  const selectedCat = filterCategory ? getCategoryById(filterCategory) : null;

  const categoryOptions = useMemo(() => {
    if (filterType === 'income') return CATEGORIES.filter(c => c.type === 'income' || c.type === 'both');
    if (filterType === 'expense') return CATEGORIES.filter(c => c.type === 'expense' || c.type === 'both');
    return CATEGORIES.filter(c => c.isActive);
  }, [filterType]);

  const handleDelete = () => {
    if (!selectedTx) return;
    Alert.alert('Supprimer', 'Confirmer la suppression ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { deleteTransaction(db, selectedTx.id); setSelectedTx(null); } },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <Feather name="search" size={15} color={C.text3} style={{ marginRight: SPACING.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une transaction..."
          placeholderTextColor={C.text3}
          value={search}
          onChangeText={handleSearchChange}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
            <Feather name="x" size={15} color={C.text3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Period navigator */}
      <PeriodNavigator
        periodType={periodType}
        offset={periodOffset}
        label={periodLabel}
        onPeriodTypeChange={(t) => { setPeriodType(t); setPeriodOffset(0); setFilterCategory(null); }}
        onOffsetChange={setPeriodOffset}
        showAll
      />

      {/* Filter row: type + category */}
      <View style={styles.filterRow}>
        {(['all', 'expense', 'income'] as FilterType[]).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => { setFilterType(f); setFilterCategory(null); }}
            style={[styles.typeChip, filterType === f && styles.typeChipActive]}
          >
            <Text style={[styles.typeChipText, filterType === f && styles.typeChipTextActive]}>
              {f === 'all' ? 'Tout' : f === 'expense' ? 'Dépenses' : 'Revenus'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.divider} />
        {selectedCat ? (
          <TouchableOpacity
            style={[styles.catChip, { borderColor: selectedCat.color, borderWidth: 1 }]}
            onPress={() => setFilterCategory(null)}
          >
            <Text>{selectedCat.icon}</Text>
            <Text style={[styles.catChipText, { color: selectedCat.color }]} numberOfLines={1}>
              {selectedCat.name}
            </Text>
            <Feather name="x" size={11} color={selectedCat.color} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.filterBtn} onPress={() => setCatModalVisible(true)}>
            <Feather name="tag" size={13} color={C.text2} />
            <Text style={styles.filterBtnText}>Catégorie</Text>
          </TouchableOpacity>
        )}
      </View>

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

      {/* Transaction list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        onEndReached={() => { if (hasMore) setVisibleCount(c => c + PAGE_SIZE); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={hasMore ? (
          <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setVisibleCount(c => c + PAGE_SIZE)}>
            <Text style={styles.loadMoreText}>Charger plus ({filtered.length - visibleCount} restantes)</Text>
          </TouchableOpacity>
        ) : null}
        renderSectionHeader={({ section }) => {
          const dayIncome = section.data.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const dayExpense = section.data.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          const net = dayIncome - dayExpense;
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={[styles.sectionNet, { color: net >= 0 ? C.accent2 : C.danger }]}>
                {net >= 0 ? '+' : ''}{net.toLocaleString('fr-FR')} {currencySymbol}
              </Text>
            </View>
          );
        }}
        renderItem={({ item }) => {
          const cat = getCategoryById(item.categoryId);
          return cat ? (
            <TransactionItem transaction={item} category={cat} currencySymbol={currencySymbol} onPress={() => setSelectedTx(item)} />
          ) : null;
        }}
        ListEmptyComponent={<Text style={styles.empty}>Aucune transaction trouvée</Text>}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add')}>
        <Feather name="plus" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Category picker modal */}
      <Modal visible={catModalVisible} transparent animationType="slide" onRequestClose={() => setCatModalVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setCatModalVisible(false)}>
          <View style={styles.catSheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Filtrer par catégorie</Text>
            <View style={styles.catGrid}>
              {categoryOptions.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catGridItem, filterCategory === cat.id && { backgroundColor: cat.color + '33', borderColor: cat.color, borderWidth: 1 }]}
                  onPress={() => { setFilterCategory(filterCategory === cat.id ? null : cat.id); setCatModalVisible(false); }}
                >
                  <Text>{cat.icon}</Text>
                  <Text style={[styles.catGridText, filterCategory === cat.id && { color: cat.color }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transaction detail modal */}
      <Modal visible={!!selectedTx} transparent animationType="slide" onRequestClose={() => setSelectedTx(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} activeOpacity={1} onPress={() => setSelectedTx(null)} />
        <View style={styles.bottomSheet}>
          {selectedTx && (
            <>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>
                {selectedTx.note || getCategoryById(selectedTx.categoryId)?.name}
              </Text>
              <Text style={[styles.sheetAmount, { color: selectedTx.type === 'income' ? C.accent2 : C.danger }]}>
                {selectedTx.type === 'expense' ? '−' : '+'}{currencySymbol} {selectedTx.amount.toLocaleString('fr-FR')}
              </Text>
              <Text style={styles.sheetDate}>
                {new Date(selectedTx.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <TouchableOpacity style={styles.sheetBtn} onPress={() => { setSelectedTx(null); router.push({ pathname: '/add', params: { txId: selectedTx.id } }); }}>
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
