import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { PeriodType } from '../db/schema';
import { DARK_COLORS as C, SPACING, RADIUS, TYPOGRAPHY as T } from '../constants/theme';

interface PeriodOption {
  value: PeriodType;
  label: string;
}

const PERIODS: PeriodOption[] = [
  { value: 'week', label: 'SEMAINE' },
  { value: 'month', label: 'MOIS' },
  { value: 'quarter', label: 'TRIMESTRE' },
  { value: 'year', label: 'ANNÉE' },
  { value: 'custom', label: 'CUSTOM' },
];

interface Props {
  selected: PeriodType;
  onSelect: (period: PeriodType) => void;
}

export default function PeriodSelector({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {PERIODS.map((p) => (
        <TouchableOpacity
          key={p.value}
          onPress={() => onSelect(p.value)}
          style={[styles.tab, selected === p.value && styles.tabActive]}
          accessibilityLabel={p.label}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === p.value }}
        >
          <Text style={[styles.label, selected === p.value && styles.labelActive]}>
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  tab: {
    height: 36,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  tabActive: {
    backgroundColor: C.accent,
  },
  label: {
    fontFamily: T.fonts.semibold,
    fontSize: T.sizes.xs,
    color: C.text2,
    letterSpacing: 0.5,
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
