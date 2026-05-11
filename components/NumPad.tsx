import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { DARK_COLORS as C, SPACING, TYPOGRAPHY as T, RADIUS } from '../constants/theme';

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  onConfirm: () => void;
  visible: boolean;
}

const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
];

export default function NumPad({ value, onValueChange, onConfirm, visible }: Props) {
  const handleKey = async (key: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === '⌫') {
      onValueChange(value.slice(0, -1));
    } else if (key === '.') {
      if (!value.includes('.')) onValueChange(value + '.');
    } else {
      if (value.length >= 10) return;
      if (value === '0' && key !== '.') onValueChange(key);
      else onValueChange(value + key);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.pad}>
          <View style={styles.display}>
            <Text style={styles.displayText}>{value || '0'}</Text>
          </View>
          {KEYS.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map(key => (
                <TouchableOpacity
                  key={key}
                  style={styles.key}
                  onPress={() => handleKey(key)}
                  accessibilityLabel={key === '⌫' ? 'Effacer' : key}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
            <Text style={styles.confirmText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pad: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.lg, paddingBottom: 40,
  },
  display: {
    backgroundColor: C.surface2, borderRadius: RADIUS.md,
    padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.md,
  },
  displayText: {
    fontFamily: 'SpaceMono-Regular', fontSize: 32, color: C.text,
  },
  row: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  key: {
    flex: 1, height: 56, backgroundColor: C.surface2, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  keyText: {
    fontFamily: T.fonts.semibold, fontSize: T.sizes.xl, color: C.text,
  },
  confirmBtn: {
    backgroundColor: C.accent, borderRadius: RADIUS.md, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xs,
  },
  confirmText: {
    fontFamily: T.fonts.semibold, fontSize: T.sizes.xl, color: '#FFF',
  },
});
