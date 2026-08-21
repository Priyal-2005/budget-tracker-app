import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipSelect } from '@/components/chip-select';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useRecurringItems } from '@/hooks/use-recurring-items';
import { useTheme } from '@/hooks/use-theme';
import { formatINR } from '@/lib/currency';
import { CATEGORY_LABELS, type ExpenseCategory, type ItemFrequency, type RecurringItem } from '@/types/database';

const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

const FREQUENCY_OPTIONS: { value: ItemFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'daily', label: 'Daily' },
];

const FREQUENCY_SECTION_ORDER: ItemFrequency[] = ['weekly', 'monthly', 'daily'];
const FREQUENCY_SECTION_TITLE: Record<ItemFrequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  daily: 'Daily',
};

export default function ItemsScreen() {
  const { items, isLoading, error, refresh, addItem, updateItem, toggleActive, removeItem } =
    useRecurringItems();
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  // Null means the modal is adding rather than editing.
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);

  const openAdd = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const openEdit = (item: RecurringItem) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const sections = useMemo(() => {
    return FREQUENCY_SECTION_ORDER.map((frequency) => ({
      title: FREQUENCY_SECTION_TITLE[frequency],
      data: items.filter((item) => item.frequency === frequency),
    })).filter((section) => section.data.length > 0);
  }, [items]);

  const handleRemove = (item: RecurringItem) => {
    Alert.alert('Remove item', `Remove "${item.name}" from your recurring items?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeItem(item.id) },
    ]);
  };

  return (
    <ThemedView type="background" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ThemedView style={styles.header}>
          <ThemedText type="screenTitle">Recurring Items</ThemedText>
          <Pressable
            onPress={openAdd}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
            ]}>
            <ThemedText style={styles.addButtonLabel}>+ Add</ThemedText>
          </Pressable>
        </ThemedView>

        {error && (
          <ThemedText themeColor="danger" type="caption" style={styles.padded}>
            {error}
          </ThemedText>
        )}

        {!isLoading && items.length === 0 && !error && (
          <ThemedView style={styles.padded}>
            <ThemedText type="caption" themeColor="textSecondary">
              No items yet. Add the things you buy every week or month — milk, fruits, medicines — so your
              Sunday logging is just a tap.
            </ThemedText>
          </ThemedView>
        )}

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <ThemedText type="sectionLabel" themeColor="textMuted" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => (
            <Pressable onPress={() => openEdit(item)} onLongPress={() => handleRemove(item)}>
              <Card style={[styles.row, !item.is_active && styles.rowInactive]}>
                <ThemedView style={styles.rowInfo}>
                  <ThemedText style={styles.rowTitle}>{item.name}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {CATEGORY_LABELS[item.category]}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.rowRight}>
                  <ThemedText style={styles.rowAmount}>{formatINR(item.default_amount)}</ThemedText>
                  <Pressable onPress={() => toggleActive(item.id, !item.is_active)}>
                    <ThemedView
                      style={[
                        styles.statusPill,
                        { backgroundColor: item.is_active ? theme.primarySoft : theme.backgroundSelected },
                      ]}>
                      <ThemedText
                        type="caption"
                        themeColor={item.is_active ? 'primary' : 'textSecondary'}
                        style={styles.statusLabel}>
                        {item.is_active ? 'Active' : 'Paused'}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                </ThemedView>
              </Card>
            </Pressable>
          )}
        />

        <ItemModal
          visible={modalVisible}
          item={editingItem}
          onClose={() => setModalVisible(false)}
          onSubmit={(input) =>
            editingItem ? updateItem(editingItem.id, input) : addItem(input)
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function ItemModal({
  visible,
  item,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  item: RecurringItem | null;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    category: ExpenseCategory;
    default_amount: number;
    frequency: ItemFrequency;
  }) => Promise<{ error: string | null }>;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('groceries');
  const [frequency, setFrequency] = useState<ItemFrequency>('weekly');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Loads the item being edited each time the modal opens, and clears back to
  // blanks when it is opened to add something new.
  useEffect(() => {
    if (!visible) return;
    setName(item?.name ?? '');
    setAmount(item ? String(item.default_amount) : '');
    setCategory(item?.category ?? 'groceries');
    setFrequency(item?.frequency ?? 'weekly');
    setError(null);
  }, [visible, item]);

  const reset = () => {
    setName('');
    setAmount('');
    setCategory('groceries');
    setFrequency('weekly');
    setError(null);
  };

  const handleSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!name.trim()) {
      setError('Give it a name.');
      return;
    }
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Enter a valid amount.');
      return;
    }
    setIsSaving(true);
    const { error: submitError } = await onSubmit({
      name: name.trim(),
      category,
      default_amount: parsedAmount,
      frequency,
    });
    setIsSaving(false);
    if (submitError) {
      setError(submitError);
    } else {
      reset();
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView type="background" style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>{item ? 'Edit item' : 'Add item'}</ThemedText>

            <FormField label="Name" value={name} onChangeText={setName} placeholder="e.g. Milk" />
            <FormField
              label="Usual amount (₹)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="e.g. 150"
            />

            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.fieldLabel}>
                Frequency
              </ThemedText>
              <ChipSelect options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
            </ThemedView>

            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.fieldLabel}>
                Category
              </ThemedText>
              <ChipSelect options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
            </ThemedView>

            {error && (
              <ThemedText themeColor="danger" type="caption">
                {error}
              </ThemedText>
            )}

            <ThemedView style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.flex1} />
              <Button title="Save" onPress={handleSubmit} isLoading={isSaving} style={styles.flex1} />
            </ThemedView>
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
    paddingBottom: Spacing.three,
  },
  addButton: {
    paddingHorizontal: Spacing.three,
    height: 40,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLabel: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  padded: { paddingHorizontal: Spacing.four },
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.two + 2 },
  sectionHeader: { marginTop: Spacing.three, marginBottom: Spacing.one },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowInactive: { opacity: 0.55 },
  rowInfo: { gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowAmount: { fontSize: 15, fontWeight: '700' },
  rowRight: { alignItems: 'flex-end', gap: Spacing.one },
  statusPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  statusLabel: { fontWeight: '700', fontSize: 11, lineHeight: 14 },
  modalContent: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  modalTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', marginBottom: Spacing.one },
  fieldGroup: { gap: Spacing.two },
  fieldLabel: { fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three },
});
