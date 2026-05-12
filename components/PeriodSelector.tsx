import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { PeriodType } from '../db/schema';
import { useTheme, SPACING, RADIUS, TYPOGRAPHY as T } from '../constants/theme';

interface PeriodOption {
  value: PeriodType | 'all';
  label: string;
}

const PERIODS: PeriodOption[] = [
  { value: 'week', label: 'SEMAINE' },
  { value: 'month', label: 'MOIS' },
  { value: 'quarter', label: 'TRIMESTRE' },
  { value: 'year', label: 'ANNÉE' },
];

const PERIODS_WITH_ALL: PeriodOption[] = [
  { value: 'all', label: 'TOUT' },
  ...PERIODS,
];

interface Props {
  selected: PeriodType | 'all';
  onSelect: (period: PeriodType | 'all') => void;
  showAll?: boolean;
}

export default function PeriodSelector({ selected, onSelect, showAll = false }: Props) {
  const C = useTheme();
  const styles = useMemo(() => StyleSheet.create({
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
    tabActive: { backgroundColor: C.accent },
    label: {
      fontFamily: T.fonts.semibold,
      fontSize: T.sizes.xs,
      color: C.text2,
      letterSpacing: 0.5,
    },
    labelActive: { color: '#FFFFFF' },
  }), [C]);

  const options = showAll ? PERIODS_WITH_ALL : PERIODS;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((p) => (
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
