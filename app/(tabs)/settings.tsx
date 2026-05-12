import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, Modal, Alert, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { openDatabase } from '../../db/migrations';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { useAuthStore } from '../../stores/authStore';
import { exportToJSON, importFromJSON, exportToCSV } from '../../services/exportService';
import {
  requestPermissions,
  scheduleReminder,
  cancelReminder,
  cancelAllBudgetAlerts,
} from '../../services/notificationService';
import { CURRENCIES, useTheme, SPACING, TYPOGRAPHY as T, RADIUS } from '../../constants/theme';
import PinSetup from '../../components/PinSetup';

const BUDGET_THRESHOLDS = [50, 75, 80, 90, 100];

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

function Section({ title, children, styles }: { title: string; children: React.ReactNode; styles: any }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Row({ label, children, styles }: { label: string; children: React.ReactNode; styles: any }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const C = useTheme();
  const styles = useMemo(() => StyleSheet.create({
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
  }), [C]);
  const router = useRouter();
  const store = useSettingsStore();
  const { transactions, loadTransactions } = useTransactionStore();
  const { budgets, loadBudgets } = useBudgetStore();
  const { isPinEnabled, isBiometricEnabled, isBiometricAvailable, removePin, setBiometricEnabled } = useAuthStore();
  const [resetModal, setResetModal] = useState(false);
  const [pinSetupModal, setPinSetupModal] = useState(false);
  const [pinMode, setPinMode] = useState<'setup' | 'change'>('setup');
  const [showTimePicker, setShowTimePicker] = useState(false);

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

  const handleToggleBudgetNotify = async (v: boolean) => {
    if (v) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('Permission refusée', 'Activez les notifications dans les paramètres de votre téléphone.');
        return;
      }
    } else {
      await cancelAllBudgetAlerts();
    }
    update('notifyBudget', String(v));
  };

  const handleToggleReminder = async (v: boolean) => {
    if (v) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('Permission refusée', 'Activez les notifications dans les paramètres de votre téléphone.');
        return;
      }
      await scheduleReminder(store.reminderTime);
    } else {
      await cancelReminder();
    }
    update('notifyReminder', String(v));
  };

  const handleReminderTimeChange = async (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!date) return;
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const time = `${h}:${m}`;
    update('reminderTime', time);
    if (store.notifyReminder) {
      await scheduleReminder(time);
    }
  };

  const reminderTimeAsDate = (): Date => {
    const [h, m] = (store.reminderTime ?? '20:00').split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const handleTogglePin = () => {
    if (isPinEnabled) {
      Alert.alert('Désactiver le PIN', 'Voulez-vous supprimer le code PIN ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => removePin() },
      ]);
    } else {
      setPinMode('setup');
      setPinSetupModal(true);
    }
  };

  const handleChangePin = () => {
    setPinMode('change');
    setPinSetupModal(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profil */}
      <Section title="Profil" styles={styles}>
        <Row label="Prénom" styles={styles}>
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
      <Section title="Préférences" styles={styles}>
        <Row label="Devise" styles={styles}>
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
        <Row label="Thème" styles={styles}>
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
        <Row label="Format date" styles={styles}>
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
      <Section title="Notifications" styles={styles}>
        {/* Budget alerts */}
        <Row label="Alertes budget" styles={styles}>
          <Switch
            value={store.notifyBudget}
            onValueChange={handleToggleBudgetNotify}
            trackColor={{ false: C.surface3, true: C.accent }}
            thumbColor="#FFF"
          />
        </Row>
        {store.notifyBudget && (
          <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm }]}>
            <Text style={styles.rowLabel}>Seuil d'alerte</Text>
            <View style={styles.chips}>
              {BUDGET_THRESHOLDS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, store.budgetAlertThreshold === t && styles.chipActive]}
                  onPress={() => update('budgetAlertThreshold', String(t))}
                >
                  <Text style={[styles.chipText, store.budgetAlertThreshold === t && styles.chipTextActive]}>
                    {t}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Daily reminder */}
        <Row label="Rappel quotidien" styles={styles}>
          <Switch
            value={store.notifyReminder}
            onValueChange={handleToggleReminder}
            trackColor={{ false: C.surface3, true: C.accent }}
            thumbColor="#FFF"
          />
        </Row>
        {store.notifyReminder && (
          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.rowLabel}>Heure du rappel</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
              <Text style={[styles.rowLabel, { color: C.accent }]}>{store.reminderTime}</Text>
              <Feather name="clock" size={16} color={C.accent} />
            </View>
          </TouchableOpacity>
        )}
        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={reminderTimeAsDate()}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleReminderTimeChange}
          />
        )}
      </Section>

      {/* Sécurité */}
      <Section title="Sécurité" styles={styles}>
        <Row label="Code PIN" styles={styles}>
          <Switch
            value={isPinEnabled}
            onValueChange={handleTogglePin}
            trackColor={{ false: C.surface3, true: C.accent }}
            thumbColor="#FFF"
          />
        </Row>
        {isPinEnabled && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleChangePin}>
            <Feather name="edit-2" size={18} color={C.accent} />
            <Text style={[styles.actionText, { color: C.accent }]}>Modifier le PIN</Text>
          </TouchableOpacity>
        )}
        {isBiometricAvailable && (
          <Row label="Déverrouillage biométrique" styles={styles}>
            <Switch
              value={isBiometricEnabled}
              onValueChange={v => {
                if (v && !isPinEnabled) {
                  Alert.alert('PIN requis', 'Activez d\'abord le code PIN pour utiliser la biométrie.');
                  return;
                }
                setBiometricEnabled(v);
              }}
              trackColor={{ false: C.surface3, true: C.accent }}
              thumbColor="#FFF"
            />
          </Row>
        )}
      </Section>

      {/* Catégories */}
      <Section title="Catégories" styles={styles}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/categories')}>
          <Feather name="tag" size={18} color={C.accent} />
          <Text style={[styles.actionText, { color: C.accent }]}>Gérer les catégories</Text>
          <Feather name="chevron-right" size={16} color={C.text3} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </Section>

      {/* Données */}
      <Section title="Données" styles={styles}>
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

      {/* iOS Time Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={showTimePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { paddingBottom: SPACING.lg }]}>
              <Text style={[styles.modalTitle, { marginBottom: SPACING.lg }]}>Heure du rappel</Text>
              <DateTimePicker
                value={reminderTimeAsDate()}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleReminderTimeChange}
                themeVariant={store.theme === 'light' ? 'light' : 'dark'}
                style={{ height: 150 }}
              />
              <TouchableOpacity
                style={[styles.modalBtn, { alignSelf: 'center', marginTop: SPACING.md, backgroundColor: C.accent }]}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={{ color: '#FFF', fontFamily: T.fonts.semibold }}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* PIN Setup Modal */}
      <Modal visible={pinSetupModal} animationType="slide">
        <PinSetup
          mode={pinMode}
          onDone={() => setPinSetupModal(false)}
          onCancel={() => setPinSetupModal(false)}
        />
      </Modal>

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

