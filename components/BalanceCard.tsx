import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DARK_COLORS as C, SPACING, TYPOGRAPHY as T, RADIUS } from '../constants/theme';

interface Props {
  income: number;
  expense: number;
  currency: string;
  currencySymbol: string;
  period: string;
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function BalanceCard({ income, expense, currencySymbol, period }: Props) {
  const net = income - expense;
  const netColor = net >= 0 ? C.accent2 : C.danger;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;

  const fmt = (n: number) => `${currencySymbol} ${Math.abs(n).toLocaleString('fr-FR')}`;

  return (
    <View style={styles.card}>
      <Text style={styles.periodLabel}>{period}</Text>
      <Text style={[styles.netBalance, { color: netColor }]}>
        {net >= 0 ? '' : '−'}{fmt(net)}
      </Text>
      <Text style={styles.netLabel}>Solde net</Text>
      <View style={styles.statsRow}>
        <StatBox label="Revenus" value={fmt(income)} color={C.accent2} />
        <View style={styles.divider} />
        <StatBox label="Dépenses" value={fmt(expense)} color={C.danger} />
        <View style={styles.divider} />
        <StatBox label="Épargne" value={`${savingsRate}%`} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  periodLabel: {
    fontFamily: T.fonts.body,
    fontSize: T.sizes.xs,
    color: C.text2,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  netBalance: {
    fontFamily: T.fonts.semibold,
    fontSize: T.sizes.hero,
    letterSpacing: -0.5,
  },
  netLabel: {
    fontFamily: T.fonts.body,
    fontSize: T.sizes.sm,
    color: C.text2,
    marginBottom: SPACING.lg,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: C.surface3,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: T.sizes.xs,
    color: C.text,
    textAlign: 'center',
  },
  statLabel: {
    fontFamily: T.fonts.body,
    fontSize: T.sizes.xs,
    color: C.text2,
    marginTop: 4,
    textAlign: 'center',
  },
  divider: { width: 1, backgroundColor: C.surface2 },
});
