import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Vibration,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useTheme, SPACING, TYPOGRAPHY as T, RADIUS } from '../constants/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
const PIN_LENGTH = 4;

export default function LockScreen() {
  const C = useTheme();
  const { unlockWithPin, unlockWithBiometric, isBiometricEnabled, isBiometricAvailable } = useAuthStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.xxl },
    header: { alignItems: 'center', marginTop: SPACING.xl },
    logo: { width: 64, height: 64, borderRadius: RADIUS.lg, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
    title: { fontFamily: T.fonts.semibold, fontSize: T.sizes.xl, color: C.text, marginBottom: 4 },
    subtitle: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.text2 },
    dotsRow: { flexDirection: 'row', gap: SPACING.lg, alignItems: 'center', justifyContent: 'center', marginVertical: SPACING.lg },
    dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.text3 },
    dotFilled: { backgroundColor: C.accent, borderColor: C.accent },
    dotError: { backgroundColor: C.danger, borderColor: C.danger },
    errorText: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.danger, height: 20, textAlign: 'center' },
    keypad: { width: '80%' },
    keyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
    key: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
    keyEmpty: { width: 72, height: 72 },
    keyText: { fontFamily: T.fonts.semibold, fontSize: 24, color: C.text },
    biometricBtn: { marginTop: SPACING.sm, alignItems: 'center', justifyContent: 'center', padding: SPACING.md },
    biometricText: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.accent, marginTop: 4 },
  }), [C]);

  useEffect(() => {
    if (isBiometricEnabled && isBiometricAvailable) {
      triggerBiometric();
    }
  }, []);

  const triggerBiometric = async () => {
    await unlockWithBiometric();
  };

  const handleKey = async (key: string) => {
    if (key === '') return;

    if (key === 'del') {
      setPin(p => p.slice(0, -1));
      setError(false);
      return;
    }

    const next = pin + key;
    setPin(next);

    if (next.length === PIN_LENGTH) {
      const ok = await unlockWithPin(next);
      if (!ok) {
        setError(true);
        setShake(true);
        Vibration.vibrate(300);
        setTimeout(() => {
          setPin('');
          setError(false);
          setShake(false);
        }, 600);
      }
    }
  };

  const rows = [
    KEYS.slice(0, 3),
    KEYS.slice(3, 6),
    KEYS.slice(6, 9),
    KEYS.slice(9, 12),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Feather name="lock" size={28} color="#FFF" />
        </View>
        <Text style={styles.title}>FinTrack</Text>
        <Text style={styles.subtitle}>Entrez votre code PIN</Text>
      </View>

      <View>
        <View style={styles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < pin.length && (error ? styles.dotError : styles.dotFilled),
              ]}
            />
          ))}
        </View>
        <Text style={styles.errorText}>{error ? 'Code incorrect' : ''}</Text>
      </View>

      <View style={styles.keypad}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.keyRow}>
            {row.map((key, ki) => {
              if (key === '') return <View key={ki} style={styles.keyEmpty} />;
              return (
                <TouchableOpacity
                  key={ki}
                  style={styles.key}
                  onPress={() => handleKey(key)}
                  activeOpacity={0.7}
                >
                  {key === 'del' ? (
                    <Feather name="delete" size={22} color={C.text} />
                  ) : (
                    <Text style={styles.keyText}>{key}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {isBiometricEnabled && isBiometricAvailable && (
        <TouchableOpacity style={styles.biometricBtn} onPress={triggerBiometric}>
          <Feather name="cpu" size={28} color={C.accent} />
          <Text style={styles.biometricText}>Déverrouiller avec la biométrie</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
