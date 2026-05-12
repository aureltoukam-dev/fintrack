import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { openDatabase } from '../db/migrations';
import { useCategoryStore } from '../stores/categoryStore';
import { useTheme, SPACING, TYPOGRAPHY as T, RADIUS } from '../constants/theme';

const db = openDatabase();

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#F0E68C', '#87CEEB', '#7C6FFF', '#FFD166',
  '#06D6A0', '#FF9F43', '#EE5A24', '#C44569', '#786FA6',
];

const PRESET_ICONS = [
  '🛒', '🚗', '🏠', '💊', '🎬', '📚', '👕', '📱', '💼', '💻',
  '🏪', '💸', '🎵', '🏋️', '✈️', '🍽️', '☕', '🎮', '🐾', '🌿',
  '⚡', '🔧', '🎁', '💈', '🧴',
];

type CategoryType = 'expense' | 'income';

export default function CategoriesScreen() {
  const C = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { padding: SPACING.lg },
    sectionTitle: { fontFamily: T.fonts.semibold, fontSize: T.sizes.sm, color: C.text2, marginBottom: SPACING.sm, letterSpacing: 0.5 },
    card: { backgroundColor: C.surface, borderRadius: RADIUS.lg, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: C.surface2 },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm },
    icon: { fontSize: 18, marginRight: SPACING.sm },
    name: { flex: 1, fontFamily: T.fonts.body, fontSize: T.sizes.md, color: C.text },
    typeBadge: { fontFamily: T.fonts.body, fontSize: T.sizes.xs, color: C.text3 },
    actions: { flexDirection: 'row', gap: SPACING.sm },
    actionBtn: { padding: SPACING.xs },
    emptyBox: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center' },
    emptyText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md, color: C.text2 },
    emptyHint: { fontFamily: T.fonts.body, fontSize: T.sizes.sm, color: C.text3, marginTop: 4 },
    fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', elevation: 8 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.xl, paddingBottom: 40, maxHeight: '85%' },
    handle: { width: 40, height: 4, backgroundColor: C.surface3, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg },
    sheetTitle: { fontFamily: T.fonts.semibold, fontSize: T.sizes.xl, color: C.text, marginBottom: SPACING.lg },
    label: { fontFamily: T.fonts.semibold, fontSize: T.sizes.xs, color: C.text2, marginBottom: SPACING.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: C.surface2, borderRadius: RADIUS.md, padding: SPACING.md, fontFamily: T.fonts.body, fontSize: T.sizes.md, color: C.text, marginBottom: SPACING.md },
    typeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
    typeBtn: { flex: 1, height: 40, borderRadius: RADIUS.md, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
    typeBtnText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.sm, color: C.text2 },
    iconPicker: { marginBottom: SPACING.md },
    iconOption: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.xs },
    iconOptionText: { fontSize: 24 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
    colorDot: { width: 32, height: 32, borderRadius: 16 },
    colorDotActive: { borderWidth: 3, borderColor: '#FFF' },
    preview: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg, gap: SPACING.sm },
    previewIcon: { fontSize: 28 },
    previewName: { fontFamily: T.fonts.semibold, fontSize: T.sizes.lg },
    saveBtn: { backgroundColor: C.accent, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
    saveBtnText: { fontFamily: T.fonts.semibold, fontSize: T.sizes.md, color: '#FFF' },
  }), [C]);
  const router = useRouter();
  const { customCategories, allCategories, loadCategories, addCategory, updateCategory, deleteCategory } = useCategoryStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📌');
  const [color, setColor] = useState('#9896B0');
  const [type, setType] = useState<CategoryType>('expense');

  useEffect(() => { loadCategories(db); }, []);

  const openAdd = () => {
    setEditId(null);
    setName('');
    setIcon('📌');
    setColor('#9896B0');
    setType('expense');
    setModalVisible(true);
  };

  const openEdit = (cat: typeof customCategories[0]) => {
    setEditId(cat.id);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setType(cat.type as CategoryType);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Erreur', 'Le nom est requis'); return; }
    if (editId) {
      updateCategory(db, editId, { name: name.trim(), icon, color, type });
    } else {
      addCategory(db, { name: name.trim(), icon, color, type });
    }
    setModalVisible(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Supprimer', 'Supprimer cette catégorie ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: () => deleteCategory(db, id),
      },
    ]);
  };

  const defaultCategories = allCategories.filter(c => !c.isCustom);
  const custom = allCategories.filter(c => c.isCustom);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Default categories (read-only) */}
        <Text style={styles.sectionTitle}>CATÉGORIES PAR DÉFAUT</Text>
        <View style={styles.card}>
          {defaultCategories.map((cat, i) => (
            <View key={cat.id} style={[styles.row, i < defaultCategories.length - 1 && styles.rowBorder]}>
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <Text style={styles.icon}>{cat.icon}</Text>
              <Text style={styles.name}>{cat.name}</Text>
              <Text style={styles.typeBadge}>{cat.type === 'expense' ? 'Dépense' : cat.type === 'income' ? 'Revenu' : 'Les deux'}</Text>
            </View>
          ))}
        </View>

        {/* Custom categories */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>MES CATÉGORIES</Text>
        {custom.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aucune catégorie personnalisée</Text>
            <Text style={styles.emptyHint}>Appuyez sur + pour en créer une</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {custom.map((cat, i) => (
              <View key={cat.id} style={[styles.row, i < custom.length - 1 && styles.rowBorder]}>
                <View style={[styles.dot, { backgroundColor: cat.color }]} />
                <Text style={styles.icon}>{cat.icon}</Text>
                <Text style={styles.name}>{cat.name}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => {
                      const raw = customCategories.find(c => c.id === cat.id);
                      if (raw) openEdit(raw);
                    }}
                    style={styles.actionBtn}
                  >
                    <Feather name="edit-2" size={16} color={C.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(cat.id)} style={styles.actionBtn}>
                    <Feather name="trash-2" size={16} color={C.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Feather name="plus" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{editId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</Text>

          {/* Name */}
          <Text style={styles.label}>Nom</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Animaux de compagnie"
            placeholderTextColor={C.text3}
            maxLength={30}
          />

          {/* Type toggle */}
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            {(['expense', 'income'] as CategoryType[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, type === t && { backgroundColor: t === 'expense' ? C.danger : C.accent2 }]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeBtnText, type === t && { color: '#FFF' }]}>
                  {t === 'expense' ? 'Dépense' : 'Revenu'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Icon picker */}
          <Text style={styles.label}>Icône</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconPicker}>
            {PRESET_ICONS.map(ic => (
              <TouchableOpacity
                key={ic}
                style={[styles.iconOption, icon === ic && { backgroundColor: C.accent + '44' }]}
                onPress={() => setIcon(ic)}
              >
                <Text style={styles.iconOptionText}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Color picker */}
          <Text style={styles.label}>Couleur</Text>
          <View style={styles.colorGrid}>
            {PRESET_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          {/* Preview */}
          <View style={[styles.preview, { backgroundColor: color + '22' }]}>
            <Text style={styles.previewIcon}>{icon}</Text>
            <Text style={[styles.previewName, { color }]}>{name || 'Aperçu'}</Text>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

