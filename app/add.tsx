import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { openDatabase } from '../db/migrations';
import { useTransactionStore } from '../stores/transactionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCategoryStore } from '../stores/categoryStore';
import { getTransactionById } from '../db/queries';
import NumPad from '../components/NumPad';
import { DARK_COLORS as C, SPACING, TYPOGRAPHY as T, RADIUS } from '../constants/theme';

const db = openDatabase();

export default function AddScreen() {
  const router = useRouter();
  const { txId } = useLocalSearchParams<{ txId?: string }>();
  const isEdit = !!txId;

  const { addTransaction: addTx, updateTransaction: updateTx, loadTransactions } = useTransactionStore();
  const { getCurrencySymbol, loadSettings } = useSettingsStore();
  const { allCategories } = useCategoryStore();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [numPadVisible, setNumPadVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSettings(db);
    if (txId) {
      const tx = getTransactionById(db, txId);
      if (tx) {
        setType(tx.type);
        setAmount(String(tx.amount));
        setCategoryId(tx.categoryId);
        setNote(tx.note ?? '');
        setDate(new Date(tx.date + 'T12:00:00'));
      }
    }
  }, [txId]);

  const categories = allCategories.filter(c => (c.type === type || c.type === 'both') && c.isActive);
  const currencySymbol = getCurrencySymbol();
  const parsedAmount = parseFloat(amount) || 0;
  const canSave = parsedAmount > 0 && categoryId;

  const showToast = () => {
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  };

  const handleSave = () => {
    if (!canSave) { Alert.alert('Erreur', 'Veuillez saisir un montant et une catégorie.'); return; }
    const dateStr = date.toISOString().split('T')[0];
    if (isEdit && txId) {
      updateTx(db, txId, { type, amount: parsedAmount, categoryId, note: note.trim() || undefined, date: dateStr });
    } else {
      addTx(db, { type, amount: parsedAmount, categoryId, note: note.trim() || undefined, date: dateStr });
    }
    showToast();
    setTimeout(() => router.back(), 500);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
            onPress={() => { setType('expense'); setCategoryId('food'); }}
          >
            <Text style={[styles.typeText, type === 'expense' && { color: '#FFF' }]}>Dépense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
            onPress={() => { setType('income'); setCategoryId('salary'); }}
          >
            <Text style={[styles.typeText, type === 'income' && { color: '#FFF' }]}>Revenu</Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <TouchableOpacity style={styles.amountBox} onPress={() => setNumPadVisible(true)}>
          <Text style={[styles.amountText, { color: type === 'expense' ? C.danger : C.accent2 }]}>
            {amount || '0'} {currencySymbol}
          </Text>
          <Text style={styles.tapHint}>Appuyez pour saisir</Text>
        </TouchableOpacity>

        {/* Categories */}
        <Text style={styles.label}>Catégorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategoryId(cat.id)}
              style={[styles.catChip, categoryId === cat.id && { backgroundColor: cat.color + '33' }]}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={[styles.catLabel, categoryId === cat.id && { color: cat.color }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Note */}
        <Text style={styles.label}>Note (optionnel)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Ajouter une note..."
          placeholderTextColor={C.text3}
          value={note}
          onChangeText={v => setNote(v.slice(0, 200))}
          multiline
          maxLength={200}
        />

        {/* Date */}
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
          <Feather name="calendar" size={16} color={C.text2} />
          <Text style={styles.dateText}>
            {date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
          />
        )}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>
            {isEdit ? 'Modifier' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* NumPad */}
      <NumPad
        value={amount}
        onValueChange={setAmount}
        onConfirm={() => setNumPadVisible(false)}
        visible={numPadVisible}
      />

      {/* Toast */}
      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Feather name="check-circle" size={16} color="#FFF" />
          <Text style={styles.toastText}>
            {isEdit ? 'Transaction modifiée ✓' : 'Transaction enregistrée ✓'}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  typeToggle: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  typeBtn: { flex: 1, height: 44, borderRadius: RADIUS.md, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  typeBtnExpense: { backgroundColor: C.danger },
  typeBtnIncome: { backgroundColor: C.accent2 },
  typeText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md, color: C.text2 },
  amountBox: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.lg },
  amountText: { fontFamily: 'SpaceMono-Regular', fontSize: 40, fontWeight: '600' },
  tapHint: { fontFamily: T.fonts.body, fontSize: T.sizes.xs, color: C.text3, marginTop: SPACING.xs },
  label: { fontFamily: T.fonts.semibold, fontSize: T.sizes.sm, color: C.text2, marginBottom: SPACING.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoriesScroll: { marginBottom: SPACING.lg },
  catChip: {
    alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    marginRight: SPACING.xs, borderRadius: RADIUS.md, backgroundColor: C.surface2, minWidth: 72,
  },
  catIcon: { fontSize: 20, marginBottom: 2 },
  catLabel: { fontFamily: T.fonts.body, fontSize: T.sizes.xs, color: C.text2, textAlign: 'center' },
  noteInput: {
    backgroundColor: C.surface2, borderRadius: RADIUS.md, padding: SPACING.md,
    fontFamily: T.fonts.body, fontSize: T.sizes.md, color: C.text,
    minHeight: 80, textAlignVertical: 'top', marginBottom: SPACING.lg,
  },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: C.surface2, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg,
  },
  dateText: { fontFamily: T.fonts.body, fontSize: T.sizes.md, color: C.text },
  saveBtn: { backgroundColor: C.accent, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', height: 52, justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.lg, color: '#FFF' },
  toast: {
    position: 'absolute', bottom: 100, left: 24, right: 24,
    backgroundColor: '#2A2A3A', borderRadius: RADIUS.md, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  toastText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.sm, color: '#FFF' },
});
