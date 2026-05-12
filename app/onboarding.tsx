import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { openDatabase } from '../db/migrations';
import { useSettingsStore } from '../stores/settingsStore';
import { CURRENCIES, useTheme, SPACING, TYPOGRAPHY as T, RADIUS } from '../constants/theme';

const db = openDatabase();
const { width } = Dimensions.get('window');

const STEPS = [
  {
    title: 'Bienvenue sur FinTrack',
    subtitle: 'Gérez vos finances 100% hors ligne, en toute confidentialité.',
    emoji: '💰',
  },
  {
    title: 'Votre prénom',
    subtitle: 'Personnalisez votre tableau de bord.',
    emoji: '👋',
  },
  {
    title: 'Votre devise',
    subtitle: 'Choisissez la devise principale.',
    emoji: '💱',
  },
  {
    title: 'Tout est prêt !',
    subtitle: 'Vous pouvez commencer à enregistrer vos transactions.',
    emoji: '🚀',
  },
];

export default function OnboardingScreen() {
  const C = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg, paddingTop: 60 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xs, marginBottom: SPACING.xxl },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.surface3 },
    dotActive: { backgroundColor: C.accent, width: 24 },
    content: { flex: 1, paddingHorizontal: SPACING.xxl, alignItems: 'center' },
    emoji: { fontSize: 72, marginBottom: SPACING.lg },
    title: { fontFamily: T.fonts.semibold, fontSize: T.sizes.xl, color: C.text, textAlign: 'center', marginBottom: SPACING.sm },
    subtitle: { fontFamily: T.fonts.body, fontSize: T.sizes.md, color: C.text2, textAlign: 'center', marginBottom: SPACING.xxl },
    input: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, fontFamily: T.fonts.body, fontSize: T.sizes.lg, color: C.text, width: '100%', textAlign: 'center' },
    currencyList: { width: '100%', maxHeight: 300 },
    currencyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.xs },
    currencyItemActive: { backgroundColor: C.accent },
    currencyCode: { fontFamily: 'SpaceMono-Regular', fontSize: T.sizes.md, color: C.text, width: 48 },
    currencyInfo: { flex: 1, marginLeft: SPACING.sm },
    currencySymbol: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md, color: C.text },
    currencyName: { fontFamily: T.fonts.body, fontSize: T.sizes.xs, color: C.text2 },
    checkmark: { color: '#FFF', fontFamily: T.fonts.semibold, fontSize: T.sizes.lg },
    footer: { flexDirection: 'row', padding: SPACING.xxl, gap: SPACING.sm, paddingBottom: 40 },
    backBtn: { flex: 1, height: 52, borderRadius: RADIUS.md, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
    backText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md, color: C.text2 },
    nextBtn: { flex: 2, height: 52, borderRadius: RADIUS.md, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
    nextBtnDisabled: { opacity: 0.4 },
    nextText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md, color: '#FFF' },
  }), [C]);
  const router = useRouter();
  const { updateSetting } = useSettingsStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('XAF');

  const handleNext = () => {
    if (step === STEPS.length - 1) {
      if (name.trim()) updateSetting(db, 'name', name.trim());
      updateSetting(db, 'currency', currency);
      updateSetting(db, 'onboarding_done', 'true');
      router.replace('/(tabs)');
    } else {
      setStep(s => s + 1);
    }
  };

  const isNextDisabled = step === 1 && !name.trim();

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.emoji}>{STEPS[step].emoji}</Text>
        <Text style={styles.title}>{STEPS[step].title}</Text>
        <Text style={styles.subtitle}>{STEPS[step].subtitle}</Text>

        {step === 1 && (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Votre prénom..."
            placeholderTextColor={C.text3}
            autoFocus
            maxLength={30}
          />
        )}

        {step === 2 && (
          <ScrollView style={styles.currencyList} showsVerticalScrollIndicator={false}>
            {CURRENCIES.map(cur => (
              <TouchableOpacity
                key={cur.code}
                style={[styles.currencyItem, currency === cur.code && styles.currencyItemActive]}
                onPress={() => setCurrency(cur.code)}
              >
                <Text style={[styles.currencyCode, currency === cur.code && { color: '#FFF' }]}>
                  {cur.code}
                </Text>
                <View style={styles.currencyInfo}>
                  <Text style={[styles.currencySymbol, currency === cur.code && { color: '#FFF' }]}>
                    {cur.symbol}
                  </Text>
                  <Text style={[styles.currencyName, currency === cur.code && { color: C.surface2 }]}>
                    {cur.name}
                  </Text>
                </View>
                {currency === cur.code && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Navigation */}
      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, isNextDisabled && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={isNextDisabled}
        >
          <Text style={styles.nextText}>
            {step === STEPS.length - 1 ? 'Commencer' : 'Continuer'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

