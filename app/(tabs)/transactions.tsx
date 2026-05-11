import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { Transaction } from '../../db/schema';
import { DARK_COLORS as C, SPACING, TYPOGRAPHY as T, RADIUS } from '../../constants/theme';

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

export default function TransactionsScreen() {
  const router = useRouter();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { transactions, loadTransactions, deleteTransaction } = useTransactionStore();
  const { getCurrencySymbol, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings(db);
    loadTransactions(db);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions(db);
    setRefreshing(false);
  }, []);

  const filtered = useMemo(() => {
    let result = [...transactions];
    if (filterType !== 'all') result = result.filter(t => t.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => {
        const cat = getCategoryById(t.categoryId);
        return (t.note?.toLowerCase().includes(q) || cat?.name.toLowerCase().includes(q));
      });
    }
    return result;
  }, [transactions, filterType, search]);

  const sections = useMemo(() => groupByDate(filtered), [filtered]);
  const currencySymbol = getCurrencySymbol();

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
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color={C.text3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Type filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {(['all', 'expense', 'income'] as FilterType[]).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilterType(f)}
            style={[styles.chip, filterType === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, filterType === f && styles.chipTextActive]}>
              {f === 'all' ? 'Tout' : f === 'expense' ? 'Dépenses' : 'Revenus'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
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
              <Text style={styles.sheetDate}>{selectedTx.date}</Text>
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
    margin: SPACING.lg, paddingHorizontal: SPACING.md,
    backgroundColor: C.surface2, borderRadius: RADIUS.md, height: 44,
  },
  searchInput: {
    flex: 1, fontFamily: T.fonts.body, fontSize: T.sizes.md,
    color: C.text, height: 44,
  },
  filters: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full, backgroundColor: C.surface2, marginRight: SPACING.sm, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  chipActive: { backgroundColor: C.accent },
  chipText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.sm, color: C.text2 },
  chipTextActive: { color: '#FFF' },
  sectionHeader: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs, backgroundColor: C.bg },
  sectionTitle: { fontFamily: T.fonts.semibold, fontSize: T.sizes.sm, color: C.text2 },
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
