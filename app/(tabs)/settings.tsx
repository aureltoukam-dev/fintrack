import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, Modal, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { openDatabase } from '../../db/migrations';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { exportToJSON, importFromJSON, exportToCSV } from '../../services/exportService';
import { CURRENCIES, DARK_COLORS as C, SPACING, TYPOGRAPHY as T, RADIUS } from '../../constants/theme';

const db = openDatabase();

const THEMES = [
  { value: 'dark', label: 'Sombre' },
  { value: 'light', label: 'Clair' },
  { value: 'auto', label: 'Automatique' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'JJ/MM/AAAA' },
  { value: 'MM/DD/YYYY', label: 'MM/JJ/AAAA' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const store = useSettingsStore();
  const { transactions, loadTransactions } = useTransactionStore();
  const { budgets, loadBudgets } = useBudgetStore();
  const [resetModal, setResetModal] = useState(false);

  useEffect(() => { store.loadSettings(db); }, []);

  const update = (key: string, value: string) => store.updateSetting(db, key, value);

  const handleExportJSON = async () => {
    const allSettings: Record<string, string> = {
      currency: store.currency,
      locale: store.locale,
      name: store.name,
      theme: store.theme,
      dateFormat: store.dateFormat,
      notifyBudget: String(store.notifyBudget),
      notifyReminder: String(store.notifyReminder),
    };
    await exportToJSON(transactions, budgets, allSettings);
  };

  const handleExportCSV = async () => {
    await exportToCSV(transactions, []);
  };

  const handleImport = async () => {
    try {
      const result = await importFromJSON(db);
      Alert.alert('Import réussi', `${result.transactions} transactions, ${result.budgets} budgets importés.`);
      store.loadSettings(db);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleReset = () => {
    db.runSync('DELETE FROM transactions');
    db.runSync('DELETE FROM budgets');
    loadTransactions(db);
    loadBudgets(db);
    Alert.alert('Réinitialisation', 'Toutes les données ont été supprimées.');
    setResetModal(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profil */}
      <Section title="Profil">
        <Row label="Prénom">
          <TextInput
            style={styles.input}
            value={store.name}
            onChangeText={v => update('name', v)}
            placeholder="Votre prénom"
            placeholderTextColor={C.text3}
          />
        </Row>
      </Section>

      {/* Préférences */}
      <Section title="Préférences">
        <Row label="Devise">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              {CURRENCIES.map(cur => (
                <TouchableOpacity
                  key={cur.code}
                  style={[styles.chip, store.currency === cur.code && styles.chipActive]}
                  onPress={() => update('currency', cur.code)}
                >
                  <Text style={[styles.chipText, store.currency === cur.code && styles.chipTextActive]}>
                    {cur.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Row>
        <Row label="Thème">
          <View style={styles.chips}>
            {THEMES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chip, store.theme === t.value && styles.chipActive]}
                onPress={() => update('theme', t.value)}
              >
                <Text style={[styles.chipText, store.theme === t.value && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Row>
        <Row label="Format date">
          <View style={styles.chips}>
            {DATE_FORMATS.map(f => (
              <TouchableOpacity
                key={f.value}
                style={[styles.chip, store.dateFormat === f.value && styles.chipActive]}
                onPress={() => update('dateFormat', f.value)}
              >
                <Text style={[styles.chipText, store.dateFormat === f.value && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row label="Alertes budget">
          <Switch
            value={store.notifyBudget}
            onValueChange={v => update('notifyBudget', String(v))}
            trackColor={{ false: C.surface3, true: C.accent }}
            thumbColor="#FFF"
          />
        </Row>
        <Row label="Rappels quotidiens">
          <Switch
            value={store.notifyReminder}
            onValueChange={v => update('notifyReminder', String(v))}
            trackColor={{ false: C.surface3, true: C.accent }}
            thumbColor="#FFF"
          />
        </Row>
      </Section>

      {/* Catégories */}
      <Section title="Catégories">
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/categories')}>
          <Feather name="tag" size={18} color={C.accent} />
          <Text style={[styles.actionText, { color: C.accent }]}>Gérer les catégories</Text>
          <Feather name="chevron-right" size={16} color={C.text3} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </Section>

      {/* Données */}
      <Section title="Données">
        <TouchableOpacity style={styles.actionBtn} onPress={handleExportJSON}>
          <Feather name="download" size={18} color={C.accent} />
          <Text style={[styles.actionText, { color: C.accent }]}>Exporter JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleExportCSV}>
          <Feather name="file-text" size={18} color={C.accent} />
          <Text style={[styles.actionText, { color: C.accent }]}>Exporter CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleImport}>
          <Feather name="upload" size={18} color={C.accent2} />
          <Text style={[styles.actionText, { color: C.accent2 }]}>Importer JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setResetModal(true)}>
          <Feather name="trash-2" size={18} color={C.danger} />
          <Text style={[styles.actionText, { color: C.danger }]}>Réinitialiser les données</Text>
        </TouchableOpacity>
      </Section>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>FinTrack v1.0.0 • 100% hors ligne ✓</Text>
        <Text style={styles.infoText}>Données stockées uniquement sur cet appareil</Text>
      </View>

      {/* Reset Modal */}
      <Modal visible={resetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Réinitialiser ?</Text>
            <Text style={styles.modalText}>
              Cette action supprimera toutes les transactions et budgets. Les paramètres seront conservés.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setResetModal(false)}>
                <Text style={{ color: C.text2, fontFamily: T.fonts.semibold }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: C.danger }]} onPress={handleReset}>
                <Text style={{ color: '#FFF', fontFamily: T.fonts.semibold }}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontFamily: T.fonts.semibold, fontSize: T.sizes.sm, color: C.text2, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionContent: { backgroundColor: C.surface, borderRadius: RADIUS.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: C.surface2 },
  rowLabel: { fontFamily: T.fonts.body, fontSize: T.sizes.md, color: C.text },
  input: { fontFamily: T.fonts.body, fontSize: T.sizes.md, color: C.text, textAlign: 'right', minWidth: 120 },
  chips: { flexDirection: 'row', gap: SPACING.xs },
  chip: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: C.surface2 },
  chipActive: { backgroundColor: C.accent },
  chipText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.xs, color: C.text2 },
  chipTextActive: { color: '#FFF' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: C.surface2 },
  actionText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md },
  infoBox: { alignItems: 'center', paddingVertical: SPACING.xl },
  infoText: { fontFamily: T.fonts.body, fontSize: T.sizes.xs, color: C.text3, marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.xl, width: '80%' },
  modalTitle: { fontFamily: T.fonts.semibold, fontSize: T.sizes.lg, color: C.text, marginBottom: SPACING.sm },
  modalText: { fontFamily: T.fonts.body, fontSize: T.sizes.md, color: C.text2, marginBottom: SPACING.lg },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, justifyContent: 'flex-end' },
  modalBtn: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: C.surface2 },
});
