import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { openDatabase } from '../../db/migrations';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getPeriodDates, getBarSlicesForPeriod } from '../../services/periodFilter';
import { CATEGORIES } from '../../constants/categories';
import BalanceCard from '../../components/BalanceCard';
import PeriodSelector from '../../components/PeriodSelector';
import BarChart from '../../components/BarChart';
import DonutChart from '../../components/DonutChart';
import TransactionItem from '../../components/TransactionItem';
import { PeriodType } from '../../db/schema';
import { DARK_COLORS as C, SPACING, TYPOGRAPHY as T } from '../../constants/theme';

const db = openDatabase();

export default function DashboardScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodType>('month');
  const [refreshing, setRefreshing] = useState(false);

  const { transactions, loadTransactions, getPeriodStats, getCategoryStats } = useTransactionStore();
  const { currency, name, getCurrencySymbol, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings(db);
    loadTransactions(db);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions(db);
    setTimeout(() => setRefreshing(false), 0);
  }, []);

  const { startDate, endDate, label: periodLabel } = getPeriodDates(period);
  const currencySymbol = getCurrencySymbol();

  const stats = useMemo(
    () => getPeriodStats(db, startDate, endDate),
    [startDate, endDate, transactions]
  );

  const categoryStats = useMemo(
    () => getCategoryStats(db, startDate, endDate),
    [startDate, endDate, transactions]
  );

  const barData = useMemo(() => {
    const safePeriod = period === 'custom' ? 'year' : period;
    const slices = getBarSlicesForPeriod(safePeriod);
    return slices.map(slice => {
      const s = getPeriodStats(db, slice.start, slice.end);
      return { label: slice.label, income: s.income, expense: s.expense };
    });
  }, [period, transactions]);

  const donutData = useMemo(() => categoryStats.slice(0, 5).map(cs => {
    const cat = CATEGORIES.find(c => c.id === cs.categoryId);
    return {
      categoryId: cs.categoryId,
      label: cat?.name ?? cs.categoryId,
      icon: cat?.icon ?? '📌',
      amount: cs.total,
      color: cat?.color ?? '#9896B0',
    };
  }), [categoryStats]);

  const donutTotal = useMemo(
    () => categoryStats.reduce((s, cs) => s + cs.total, 0),
    [categoryStats]
  );

  const recentTransactions = useMemo(() => [...transactions].slice(0, 5), [transactions]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour{name ? `, ${name}` : ''} 👋</Text>
          <Text style={styles.subtitle}>{periodLabel}</Text>
        </View>
      </View>

      {/* Period Selector */}
      <PeriodSelector selected={period} onSelect={setPeriod} />

      {/* Balance Card */}
      <View style={styles.section}>
        <BalanceCard
          income={stats.income}
          expense={stats.expense}
          currency={currency}
          currencySymbol={currencySymbol}
          period={periodLabel}
        />
      </View>

      {/* Bar Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {period === 'week' ? 'Flux de la semaine (par jour)' :
           period === 'month' ? 'Flux du mois (par semaine)' :
           period === 'quarter' ? 'Flux du trimestre (par mois)' :
           'Flux de l\'année (par mois)'}
        </Text>
        <BarChart data={barData} />
      </View>

      {/* Donut Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Répartition des dépenses</Text>
        <DonutChart data={donutData} total={donutTotal} currencySymbol={currencySymbol} />
      </View>

      {/* Recent transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transactions récentes</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={styles.seeAll}>Tout voir →</Text>
          </TouchableOpacity>
        </View>
        {recentTransactions.length === 0 ? (
          <Text style={styles.empty}>Aucune transaction</Text>
        ) : (
          recentTransactions.map(tx => {
            const cat = CATEGORIES.find(c => c.id === tx.categoryId);
            return cat ? (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                category={cat}
                currencySymbol={currencySymbol}
                onPress={() => router.push({ pathname: '/transactions', params: { txId: tx.id } })}
              />
            ) : null;
          })
        )}
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm,
  },
  greeting: { fontFamily: T.fonts.semibold, fontSize: T.sizes.xl, color: C.text },
  subtitle: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.text2, marginTop: 2 },
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md, color: C.text, marginBottom: SPACING.sm },
  seeAll: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.accent },
  empty: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.text2, textAlign: 'center', padding: SPACING.lg },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
