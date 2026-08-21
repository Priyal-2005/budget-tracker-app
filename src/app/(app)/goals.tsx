import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FormField } from '@/components/form-field';
import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useSavingsGoals } from '@/hooks/use-savings-goals';
import { useTheme } from '@/hooks/use-theme';
import { formatINR } from '@/lib/currency';
import type { SavingsGoal } from '@/types/database';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function GoalsScreen() {
  const { goals, isLoading, error, refresh, addGoal, contribute, removeGoal } = useSavingsGoals();
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleRemove = (goal: SavingsGoal) => {
    Alert.alert('Remove goal', `Remove "${goal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeGoal(goal.id) },
    ]);
  };

  return (
    <ThemedView type="background" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ThemedView style={styles.header}>
          <ThemedText type="screenTitle">Goals</ThemedText>
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
          {error && (
            <ThemedText themeColor="danger" type="caption">
              {error}
            </ThemedText>
          )}

          {!isLoading && goals.length === 0 && !error && (
            <ThemedText type="caption" themeColor="textSecondary">
              No goals yet. Saving for a laptop, a trip, or just an emergency fund? Add it here and
              put money aside as you go.
            </ThemedText>
          )}

          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onContribute={(amount) => contribute(goal, amount)}
              onLongPress={() => handleRemove(goal)}
            />
          ))}

          {goals.length > 0 && (
            <ThemedText themeColor="textMuted" type="caption" style={styles.hint}>
              Long-press a goal to remove it.
            </ThemedText>
          )}
        </ScrollView>

        <AddGoalModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={addGoal}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function GoalCard({
  goal,
  onContribute,
  onLongPress,
}: {
  goal: SavingsGoal;
  onContribute: (amount: number) => Promise<{ error: string | null }>;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const saved = Number(goal.current_amount);
  const target = Number(goal.target_amount);
  const remaining = Math.max(0, target - saved);
  const isComplete = saved >= target;

  const handleContribute = async () => {
    const parsed = Number(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) return;
    setIsSaving(true);
    const { error } = await onContribute(parsed);
    setIsSaving(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setAmount('');
      setAdding(false);
    }
  };

  return (
    <Pressable onLongPress={onLongPress}>
      <Card style={styles.card}>
        <ThemedView style={styles.cardHeader}>
          <ThemedView style={styles.cardHeaderText}>
            <ThemedText style={styles.cardTitle}>{goal.name}</ThemedText>
            {goal.target_date && (
              <ThemedText type="caption" themeColor="textSecondary">
                by{' '}
                {new Date(goal.target_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </ThemedText>
            )}
          </ThemedView>
          {isComplete ? (
            <ThemedView style={[styles.reachedPill, { backgroundColor: theme.primarySoft }]}>
              <ThemedText type="caption" themeColor="success" style={styles.reachedLabel}>
                Reached
              </ThemedText>
            </ThemedView>
          ) : (
            <Pressable onPress={() => setAdding((prev) => !prev)} hitSlop={8}>
              <ThemedText type="caption" themeColor="primary" style={styles.cardAction}>
                {adding ? 'Close' : 'Add money'}
              </ThemedText>
            </Pressable>
          )}
        </ThemedView>

        <ProgressBar progress={target === 0 ? 0 : saved / target} />

        <ThemedView style={styles.cardFooter}>
          <ThemedText type="caption" themeColor={isComplete ? 'success' : 'text'} style={styles.cardAmount}>
            {formatINR(saved)} of {formatINR(target)}
          </ThemedText>
          {!isComplete && (
            <ThemedText type="caption" themeColor="textMuted">
              {formatINR(remaining)} to go
            </ThemedText>
          )}
        </ThemedView>

        {adding && !isComplete && (
          <ThemedView style={styles.addRow}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="₹ amount"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.amountInput,
                { borderColor: theme.border, color: theme.text, backgroundColor: theme.background },
              ]}
            />
            <Button title="Add" onPress={handleContribute} isLoading={isSaving} style={styles.addButtonInline} />
          </ThemedView>
        )}
      </Card>
    </Pressable>
  );
}

function AddGoalModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    target_amount: number;
    target_date: string | null;
  }) => Promise<{ error: string | null }>;
}) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setName('');
    setTarget('');
    setTargetDate('');
    setError(null);
  };

  const handleSubmit = async () => {
    const parsed = Number(target);
    if (!name.trim()) {
      setError('Give the goal a name.');
      return;
    }
    if (!target || Number.isNaN(parsed) || parsed <= 0) {
      setError('Enter a target amount.');
      return;
    }
    if (targetDate && (!ISO_DATE.test(targetDate) || Number.isNaN(new Date(targetDate).getTime()))) {
      setError('Target date must be in YYYY-MM-DD format.');
      return;
    }
    setIsSaving(true);
    const { error: submitError } = await onSubmit({
      name: name.trim(),
      target_amount: parsed,
      target_date: targetDate || null,
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
            <ThemedText style={styles.modalTitle}>Add goal</ThemedText>

            <FormField
              label="What for?"
              value={name}
              onChangeText={setName}
              placeholder="e.g. New laptop"
            />
            <FormField
              label="Target amount (₹)"
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
              placeholder="e.g. 45000"
            />
            <FormField
              label="Target date (optional)"
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />

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
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.two + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cardHeaderText: { gap: 2, flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardAction: { fontWeight: '700' },
  cardAmount: { fontWeight: '600' },
  reachedPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  reachedLabel: { fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  amountInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    minHeight: 48,
  },
  addButtonInline: { paddingHorizontal: Spacing.four },
  hint: { marginTop: Spacing.two, textAlign: 'center' },
  modalContent: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  modalTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', marginBottom: Spacing.one },
  modalActions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three },
});
