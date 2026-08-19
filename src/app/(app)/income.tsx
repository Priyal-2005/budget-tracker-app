import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ChipSelect } from '@/components/chip-select';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useIncome } from '@/hooks/use-income';
import { useTheme } from '@/hooks/use-theme';
import { formatINR } from '@/lib/currency';
import { todayISODate } from '@/lib/date';
import { INCOME_SOURCE_LABELS, type IncomeLog, type IncomeSource } from '@/types/database';

const SOURCE_OPTIONS = (Object.keys(INCOME_SOURCE_LABELS) as IncomeSource[]).map((value) => ({
  value,
  label: INCOME_SOURCE_LABELS[value],
}));

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function IncomeScreen() {
  const { entries, total, isLoading, error, refresh, addIncome, removeIncome } = useIncome();
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const handleRemove = (entry: IncomeLog) => {
    Alert.alert('Remove entry', `Remove ${formatINR(Number(entry.amount))} from ${INCOME_SOURCE_LABELS[entry.source]}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeIncome(entry.id) },
    ]);
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ThemedView style={styles.header}>
          <ThemedView>
            <ThemedText type="title" style={styles.title}>
              Income
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {monthLabel}
            </ThemedText>
          </ThemedView>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={[styles.addButton, { backgroundColor: theme.primary }]}>
            <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
              + Add
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ScrollView contentContainerStyle={styles.listContent}>
          <ThemedView type="backgroundElement" style={styles.totalCard}>
            <ThemedText themeColor="textSecondary" type="small">
              Total this month
            </ThemedText>
            <ThemedText type="subtitle" themeColor="success" style={styles.totalValue}>
              {formatINR(total)}
            </ThemedText>
          </ThemedView>

          {error && (
            <ThemedText themeColor="danger" type="small">
              {error}
            </ThemedText>
          )}

          {!isLoading && entries.length === 0 && !error && (
            <ThemedText themeColor="textSecondary">
              No income logged for {monthLabel} yet. Add your pocket money, internship stipend or
              freelance payments here.
            </ThemedText>
          )}

          {entries.map((entry) => (
            <Pressable key={entry.id} onLongPress={() => handleRemove(entry)}>
              <ThemedView type="backgroundElement" style={styles.row}>
                <ThemedView style={styles.rowInfo}>
                  <ThemedText type="smallBold">{INCOME_SOURCE_LABELS[entry.source]}</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    {new Date(entry.received_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {entry.is_recurring ? ' · repeats monthly' : ''}
                  </ThemedText>
                </ThemedView>
                <ThemedText type="smallBold" themeColor="success">
                  {formatINR(Number(entry.amount))}
                </ThemedText>
              </ThemedView>
            </Pressable>
          ))}

          {entries.length > 0 && (
            <ThemedText themeColor="textSecondary" type="small" style={styles.hint}>
              Long-press an entry to remove it.
            </ThemedText>
          )}
        </ScrollView>

        <AddIncomeModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={addIncome}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function AddIncomeModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    source: IncomeSource;
    amount: number;
    received_at: string;
    is_recurring: boolean;
  }) => Promise<{ error: string | null }>;
}) {
  const theme = useTheme();
  const [source, setSource] = useState<IncomeSource>('pocket_money');
  const [amount, setAmount] = useState('');
  const [receivedAt, setReceivedAt] = useState(todayISODate());
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setSource('pocket_money');
    setAmount('');
    setReceivedAt(todayISODate());
    setIsRecurring(false);
    setError(null);
  };

  const handleSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!ISO_DATE.test(receivedAt) || Number.isNaN(new Date(receivedAt).getTime())) {
      setError('Date must be in YYYY-MM-DD format.');
      return;
    }
    setIsSaving(true);
    const { error: submitError } = await onSubmit({
      source,
      amount: parsedAmount,
      received_at: receivedAt,
      is_recurring: isRecurring,
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
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.modalContent}>
            <ThemedText type="title" style={styles.modalTitle}>
              Add income
            </ThemedText>

            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="smallBold">Source</ThemedText>
              <ChipSelect options={SOURCE_OPTIONS} value={source} onChange={setSource} />
            </ThemedView>

            <FormField
              label="Amount (₹)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="e.g. 5000"
            />

            <FormField
              label="Received on"
              value={receivedAt}
              onChangeText={setReceivedAt}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />

            <ThemedView style={styles.switchRow}>
              <ThemedView style={styles.switchLabel}>
                <ThemedText type="smallBold">Repeats monthly</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  Turn on for steady income like pocket money.
                </ThemedText>
              </ThemedView>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ true: theme.primary }}
              />
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
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  totalCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
    marginBottom: Spacing.two,
  },
  totalValue: { fontSize: 28, lineHeight: 34 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowInfo: { gap: 2 },
  hint: { marginTop: Spacing.two, textAlign: 'center' },
  modalContent: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  modalTitle: { fontSize: 24, lineHeight: 30, marginBottom: Spacing.two },
  fieldGroup: { gap: Spacing.two },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  switchLabel: { flex: 1, gap: 2 },
  modalActions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three },
});
