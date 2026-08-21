import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipSelect } from '@/components/chip-select';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useIncome } from '@/hooks/use-income';
import { useIncomeAverage } from '@/hooks/use-income-average';
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
  const { average, refresh: refreshAverage } = useIncomeAverage();
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshAverage();
    }, [refresh, refreshAverage])
  );

  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const handleRemove = (entry: IncomeLog) => {
    Alert.alert('Remove entry', `Remove ${formatINR(Number(entry.amount))} from ${INCOME_SOURCE_LABELS[entry.source]}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeIncome(entry.id) },
    ]);
  };

  return (
    <ThemedView type="background" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ThemedView style={styles.header}>
          <ThemedView>
            <ThemedText type="screenTitle">Income</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {monthLabel}
            </ThemedText>
          </ThemedView>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
            ]}>
            <ThemedText style={styles.addButtonLabel}>+ Add</ThemedText>
          </Pressable>
        </ThemedView>

        <ScrollView contentContainerStyle={styles.listContent}>
          <Card style={styles.totalCard}>
            <ThemedText type="caption" themeColor="textSecondary">
              Total this month
            </ThemedText>
            <ThemedText type="metric" themeColor="success">
              {formatINR(total)}
            </ThemedText>
          </Card>

          {average && (
            <Card style={styles.averageCard}>
              <ThemedText type="caption" themeColor="textSecondary">
                Internship and freelance, per month
              </ThemedText>
              <ThemedText style={styles.averageValue}>
                {formatINR(Math.round(average.monthlyAverage))}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted">
                Averaged over {average.monthsCounted === 1 ? 'last month' : `the last ${average.monthsCounted} months`}
                , not counting this one. Handy when this money is what you are planning around.
              </ThemedText>
            </Card>
          )}

          {error && (
            <ThemedText themeColor="danger" type="caption">
              {error}
            </ThemedText>
          )}

          {!isLoading && entries.length === 0 && !error && (
            <ThemedText type="caption" themeColor="textSecondary">
              No income logged for {monthLabel} yet. Add your pocket money, internship stipend or
              freelance payments here.
            </ThemedText>
          )}

          {entries.map((entry) => (
            <Pressable key={entry.id} onLongPress={() => handleRemove(entry)}>
              <Card style={styles.row}>
                <ThemedView style={styles.rowInfo}>
                  <ThemedText style={styles.rowTitle}>{INCOME_SOURCE_LABELS[entry.source]}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {new Date(entry.received_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {entry.is_recurring ? ' · repeats monthly' : ''}
                  </ThemedText>
                </ThemedView>
                <ThemedText style={styles.rowAmount} themeColor="success">
                  {formatINR(Number(entry.amount))}
                </ThemedText>
              </Card>
            </Pressable>
          ))}

          {entries.length > 0 && (
            <ThemedText type="caption" themeColor="textMuted" style={styles.hint}>
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
      <ThemedView type="background" style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Add income</ThemedText>

            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.fieldLabel}>
                Source
              </ThemedText>
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
                <ThemedText style={styles.switchTitle}>Repeats monthly</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
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
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.two + 2,
  },
  totalCard: {
    gap: Spacing.half,
    marginBottom: Spacing.one,
  },
  averageCard: {
    gap: Spacing.half,
    marginBottom: Spacing.one,
  },
  averageValue: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowInfo: { gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowAmount: { fontSize: 15, fontWeight: '700' },
  hint: { marginTop: Spacing.one, textAlign: 'center' },
  modalContent: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  modalTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', marginBottom: Spacing.one },
  fieldGroup: { gap: Spacing.two },
  fieldLabel: { fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  switchLabel: { flex: 1, gap: 2 },
  switchTitle: { fontSize: 15, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three },
});
