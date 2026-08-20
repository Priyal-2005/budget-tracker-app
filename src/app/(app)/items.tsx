import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ChipSelect } from '@/components/chip-select';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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
          <ThemedText type="title" style={styles.title}>
            Recurring Items
          </ThemedText>
          <Pressable onPress={openAdd} style={[styles.addButton, { backgroundColor: theme.primary }]}>
            <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
              + Add
            </ThemedText>
          </Pressable>
        </ThemedView>

        {error && (
          <ThemedText themeColor="danger" type="small" style={styles.padded}>
            {error}
          </ThemedText>
        )}

        {!isLoading && items.length === 0 && !error && (
          <ThemedView style={styles.padded}>
            <ThemedText themeColor="textSecondary">
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
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {section.title.toUpperCase()}
            </ThemedText>
          )}
          renderItem={({ item }) => (
            <Pressable onPress={() => openEdit(item)} onLongPress={() => handleRemove(item)}>
              <ThemedView type="backgroundElement" style={[styles.row, !item.is_active && styles.rowInactive]}>
                <ThemedView style={styles.rowInfo}>
                  <ThemedText type="smallBold">{item.name}</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    {CATEGORY_LABELS[item.category]}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.rowRight}>
                  <ThemedText type="smallBold">{formatINR(item.default_amount)}</ThemedText>
                  <Pressable onPress={() => toggleActive(item.id, !item.is_active)}>
                    <ThemedText type="small" themeColor={item.is_active ? 'success' : 'textSecondary'}>
                      {item.is_active ? 'Active' : 'Paused'}
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              </ThemedView>
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
            <ThemedText type="title" style={styles.modalTitle}>
              {item ? 'Edit item' : 'Add item'}
            </ThemedText>

            <FormField label="Name" value={name} onChangeText={setName} placeholder="e.g. Milk" />
            <FormField
              label="Usual amount (₹)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="e.g. 150"
            />

            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="smallBold">Frequency</ThemedText>
              <ChipSelect options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
            </ThemedView>

            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="smallBold">Category</ThemedText>
              <ChipSelect options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
            </ThemedView>

            {error && (
              <ThemedText themeColor="danger" type="small">
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
    paddingBottom: Spacing.two,
  },
  title: { fontSize: 28, lineHeight: 34 },
  addButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  padded: { paddingHorizontal: Spacing.four },
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.two },
  sectionHeader: { marginTop: Spacing.three, marginBottom: Spacing.one },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
  rowInactive: { opacity: 0.5 },
  rowInfo: { gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  modalContent: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  modalTitle: { fontSize: 24, lineHeight: 30, marginBottom: Spacing.two },
  fieldGroup: { gap: Spacing.two },
  modalActions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three },
});
