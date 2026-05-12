import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Vibration,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useTheme, SPACING, TYPOGRAPHY as T, RADIUS } from '../constants/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
const PIN_LENGTH = 4;

interface Props {
  onDone: () => void;
  onCancel: () => void;
  mode?: 'setup' | 'change';
}

type Step = 'enter' | 'confirm';

export default function PinSetup({ onDone, onCancel, mode = 'setup' }: Props) {
  const C = useTheme();
  const { setupPin, unlockWithPin } = useAuthStore();
  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.xxl },
    header: { alignItems: 'center', marginTop: SPACING.xl },
    logo: { width: 64, height: 64, borderRadius: RADIUS.lg, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
    title: { fontFamily: T.fonts.semibold, fontSize: T.sizes.xl, color: C.text, marginBottom: 4 },
    subtitle: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.text2, textAlign: 'center', paddingHorizontal: SPACING.xl },
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
    cancelBtn: { padding: SPACING.md },
    cancelText: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.text3 },
  }), [C]);

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
      if (step === 'enter') {
        setFirstPin(next);
        setPin('');
        setStep('confirm');
        setError(false);
      } else {
        if (next === firstPin) {
          await setupPin(next);
          onDone();
        } else {
          setError(true);
          Vibration.vibrate(300);
          setTimeout(() => {
            setPin('');
            setFirstPin('');
            setStep('enter');
            setError(false);
          }, 600);
        }
      }
    }
  };

  const rows = [
    KEYS.slice(0, 3),
    KEYS.slice(3, 6),
    KEYS.slice(6, 9),
    KEYS.slice(9, 12),
  ];

  const subtitle = step === 'enter'
    ? (mode === 'change' ? 'Choisissez un nouveau code PIN à 4 chiffres' : 'Choisissez un code PIN à 4 chiffres')
    : 'Confirmez votre code PIN';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Feather name="shield" size={28} color="#FFF" />
        </View>
        <Text style={styles.title}>
          {step === 'enter' ? 'Créer un PIN' : 'Confirmer le PIN'}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
        <Text style={styles.errorText}>{error ? 'Les codes ne correspondent pas' : ''}</Text>
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

      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelText}>Annuler</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
