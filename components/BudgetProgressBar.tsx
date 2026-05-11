import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { DARK_COLORS as C, SPACING, TYPOGRAPHY as T, RADIUS } from '../constants/theme';

interface Props {
  spent: number;
  limit: number;
  label: string;
  icon: string;
  currencySymbol: string;
  onPress?: () => void;
}

export default function BudgetProgressBar({ spent, limit, label, icon, currencySymbol, onPress }: Props) {
  const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: percent / 100,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const barColor = percent >= 100 ? C.danger : percent >= 80 ? C.warn : C.accent2;
  const showWarning = percent >= 80;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.label}>{label}</Text>
          {showWarning && <Text style={styles.warning}>⚠️</Text>}
        </View>
        <Text style={styles.percent}>{Math.round(percent)}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.bar,
            {
              backgroundColor: barColor,
              width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      <View style={styles.amounts}>
        <Text style={styles.spent}>
          {currencySymbol} {spent.toLocaleString('fr-FR')} dépensé
        </Text>
        <Text style={styles.limit}>
          / {currencySymbol} {limit.toLocaleString('fr-FR')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  icon: { fontSize: 20 },
  label: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md, color: C.text },
  warning: { fontSize: 16 },
  percent: { fontFamily: 'SpaceMono-Regular', fontSize: T.sizes.sm, color: C.text2 },
  track: { height: 8, backgroundColor: C.surface3, borderRadius: 4, overflow: 'hidden', marginBottom: SPACING.xs },
  bar: { height: '100%', borderRadius: 4 },
  amounts: { flexDirection: 'row', alignItems: 'center' },
  spent: { fontFamily: T.fonts.body, fontSize: T.sizes.xs, color: C.text2 },
  limit: { fontFamily: T.fonts.body, fontSize: T.sizes.xs, color: C.text3 },
});
