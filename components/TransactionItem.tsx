import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction, Category } from '../db/schema';
import { DARK_COLORS as C, SPACING, TYPOGRAPHY as T, RADIUS } from '../constants/theme';

interface Props {
  transaction: Transaction;
  category: Category;
  currencySymbol: string;
  onPress: () => void;
}

export default function TransactionItem({ transaction, category, currencySymbol, onPress }: Props) {
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? C.accent2 : C.danger;
  const amountPrefix = isIncome ? '+' : '−';
  const label = transaction.note || category.name;
  const subLabel = `${category.name} · ${transaction.date}`;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      accessibilityLabel={`${label}, ${amountPrefix}${transaction.amount} ${currencySymbol}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: category.color + '21' }]}>
        <Text style={styles.icon}>{category.icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Text style={styles.subLabel} numberOfLines={1}>{subLabel}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {amountPrefix}{currencySymbol} {transaction.amount.toLocaleString('fr-FR')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    minHeight: 64,
    backgroundColor: C.bg,
  },
  iconContainer: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
  },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  label: {
    fontFamily: T.fonts.semibold, fontSize: T.sizes.md, color: C.text,
  },
  subLabel: {
    fontFamily: T.fonts.body, fontSize: T.sizes.xs, color: C.text2, marginTop: 2,
  },
  amount: {
    fontFamily: 'SpaceMono-Regular', fontSize: T.sizes.md,
    textAlign: 'right', marginLeft: SPACING.sm,
  },
});
