import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, SPACING, TYPOGRAPHY as T, RADIUS } from '../constants/theme';
import type { PeriodFilterType } from '../db/schema';

interface Props {
  periodType: PeriodFilterType;
  offset: number;
  label: string;
  onPeriodTypeChange: (type: PeriodFilterType) => void;
  onOffsetChange: (offset: number) => void;
  showAll?: boolean;
  hideTabs?: boolean;
}

const TABS: { value: PeriodFilterType; label: string }[] = [
  { value: 'week', label: 'SEM.' },
  { value: 'month', label: 'MOIS' },
  { value: 'quarter', label: 'TRIM.' },
  { value: 'year', label: 'ANNÉE' },
];

export default function PeriodNavigator({
  periodType, offset, label,
  onPeriodTypeChange, onOffsetChange,
  showAll = true, hideTabs = false,
}: Props) {
  const C = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { paddingBottom: SPACING.xs },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.xs,
      gap: SPACING.xs,
    },
    tab: {
      paddingHorizontal: SPACING.md,
      paddingVertical: 5,
      borderRadius: RADIUS.full,
    },
    tabActive: { backgroundColor: C.accent },
    tabText: { fontFamily: T.fonts.semibold, fontSize: 11, color: C.text3, letterSpacing: 0.5 },
    tabTextActive: { color: '#FFF' },
    navigator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.xs,
    },
    navBtn: { padding: SPACING.sm },
    navLabel: { fontFamily: T.fonts.semibold, fontSize: T.sizes.sm, color: C.text },
    navBtnDisabled: { opacity: 0.25 },
  }), [C]);

  const tabs = showAll ? [{ value: 'all' as PeriodFilterType, label: 'TOUT' }, ...TABS] : TABS;

  return (
    <View style={styles.container}>
      {!hideTabs && (
        <View style={styles.tabs}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.tab, periodType === t.value && styles.tabActive]}
              onPress={() => { onPeriodTypeChange(t.value); onOffsetChange(0); }}
            >
              <Text style={[styles.tabText, periodType === t.value && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {periodType !== 'all' && (
        <View style={styles.navigator}>
          <TouchableOpacity style={styles.navBtn} onPress={() => onOffsetChange(offset - 1)}>
            <Feather name="chevron-left" size={20} color={C.text2} />
          </TouchableOpacity>
          <Text style={styles.navLabel}>{label}</Text>
          <TouchableOpacity
            style={[styles.navBtn, offset >= 0 && styles.navBtnDisabled]}
            onPress={() => { if (offset < 0) onOffsetChange(offset + 1); }}
            disabled={offset >= 0}
          >
            <Feather name="chevron-right" size={20} color={C.text2} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
