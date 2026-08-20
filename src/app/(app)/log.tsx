import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useBuffer } from '@/hooks/use-buffer';
import { useLogData } from '@/hooks/use-log-data';
import { useMonthlySummary } from '@/hooks/use-monthly-summary';
import { useTheme } from '@/hooks/use-theme';
import { bufferStatusColor, bufferStatusLabel, getBufferStatus } from '@/lib/buffer-status';
import { formatINR } from '@/lib/currency';
import { notifyBufferStatus } from '@/lib/notify';
import { CATEGORY_LABELS, type RecurringItem } from '@/types/database';

type WeeklyState = Record<string, { checked: boolean; amount: string }>;

export default function LogScreen() {
  const {
    weeklyItems,
    monthlyItems,
    loggedMonthlyItemIds,
    loggedWeeklyItemIds,
    error,
    refresh,
    logItems,
    logBufferSpend,
  } = useLogData();
  const { summary, refresh: refreshSummary } = useMonthlySummary();
  const { allotted, refresh: refreshBuffer, setAllotment } = useBuffer();
  const theme = useTheme();

  // Items added on the Items tab, and buffer spent elsewhere, need to show up
  // here without a full app restart.
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshSummary();
      refreshBuffer();
    }, [refresh, refreshSummary, refreshBuffer])
  );

  const [weeklyState, setWeeklyState] = useState<WeeklyState>({});
  const [isSubmittingWeekly, setIsSubmittingWeekly] = useState(false);

  useEffect(() => {
    setWeeklyState((prev) => {
      const next = { ...prev };
      for (const item of weeklyItems) {
        if (!next[item.id]) next[item.id] = { checked: true, amount: String(item.default_amount) };
      }
      return next;
    });
  }, [weeklyItems]);

  // Anything already logged this week is excluded, so tapping the button twice
  // cannot quietly double-count the week's shop.
  const pendingWeeklyItems = weeklyItems.filter((item) => !loggedWeeklyItemIds.has(item.id));

  const handleLogWeek = async () => {
    // A cleared amount field parses as 0, which would log a zero row and still
    // count the item as done for the week, blocking the real entry.
    const entries = pendingWeeklyItems
      .filter((item) => {
        const state = weeklyState[item.id];
        if (!state?.checked) return false;
        const amount = Number(state.amount.trim());
        return state.amount.trim() !== '' && Number.isFinite(amount) && amount > 0;
      })
      .map((item) => ({
        recurring_item_id: item.id,
        amount: Number(weeklyState[item.id].amount.trim()),
        category: item.category,
      }));

    if (entries.length === 0) {
      Alert.alert('Nothing to log', 'Check at least one item and give it an amount.');
      return;
    }
    setIsSubmittingWeekly(true);
    const { error: logError } = await logItems(entries);
    setIsSubmittingWeekly(false);
    if (logError) {
      Alert.alert('Error', logError);
    } else {
      await refreshSummary();
      Alert.alert('Logged', `Logged ${entries.length} item(s) for this week.`);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <ThemedText type="title" style={styles.title}>
            Log
          </ThemedText>

          {error && (
            <ThemedText themeColor="danger" type="small">
              {error}
            </ThemedText>
          )}

          <BufferSpendCard
            bufferRemaining={summary?.bufferRemaining}
            bufferAllotted={allotted}
            onSetAllotment={setAllotment}
            onSubmit={logBufferSpend}
            onLogged={refreshSummary}
          />

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              THIS WEEK&apos;S BATCH
            </ThemedText>
            {weeklyItems.length === 0 ? (
              <ThemedText themeColor="textSecondary" type="small">
                No weekly items yet. Add some from the Items tab (milk, fruits, veggies…).
              </ThemedText>
            ) : (
              weeklyItems.map((item) =>
                loggedWeeklyItemIds.has(item.id) ? (
                  <LoggedItemRow key={item.id} item={item} />
                ) : (
                  <WeeklyItemRow
                    key={item.id}
                    item={item}
                    state={weeklyState[item.id] ?? { checked: true, amount: String(item.default_amount) }}
                    onChange={(next) => setWeeklyState((prev) => ({ ...prev, [item.id]: next }))}
                  />
                )
              )
            )}
            {pendingWeeklyItems.length > 0 && (
              <Button title="Log this week's batch" onPress={handleLogWeek} isLoading={isSubmittingWeekly} />
            )}
            {weeklyItems.length > 0 && pendingWeeklyItems.length === 0 && (
              <ThemedText themeColor="success" type="small">
                This week&apos;s shop is logged.
              </ThemedText>
            )}
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              THIS MONTH
            </ThemedText>
            {monthlyItems.length === 0 ? (
              <ThemedText themeColor="textSecondary" type="small">
                No monthly items yet. Add things like medicines or subscriptions from the Items tab.
              </ThemedText>
            ) : (
              monthlyItems.map((item) => (
                <MonthlyItemRow
                  key={item.id}
                  item={item}
                  isLogged={loggedMonthlyItemIds.has(item.id)}
                  onLog={async (amount) => {
                    const { error: logError } = await logItems([
                      { recurring_item_id: item.id, amount, category: item.category },
                    ]);
                    if (logError) Alert.alert('Error', logError);
                    else await refreshSummary();
                  }}
                />
              ))
            )}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function WeeklyItemRow({
  item,
  state,
  onChange,
}: {
  item: RecurringItem;
  state: { checked: boolean; amount: string };
  onChange: (next: { checked: boolean; amount: string }) => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.itemRow}>
      <Pressable
        onPress={() => onChange({ ...state, checked: !state.checked })}
        style={[
          styles.checkbox,
          { borderColor: theme.border, backgroundColor: state.checked ? theme.primary : 'transparent' },
        ]}>
        {state.checked && <ThemedText style={{ color: '#ffffff', fontSize: 12 }}>✓</ThemedText>}
      </Pressable>
      <ThemedView style={styles.itemRowInfo}>
        <ThemedText type="default">{item.name}</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          {CATEGORY_LABELS[item.category]}
        </ThemedText>
      </ThemedView>
      <TextInput
        value={state.amount}
        onChangeText={(amount) => onChange({ ...state, amount })}
        keyboardType="decimal-pad"
        editable={state.checked}
        style={[
          styles.amountInput,
          { borderColor: theme.border, color: theme.text, opacity: state.checked ? 1 : 0.4 },
        ]}
      />
    </ThemedView>
  );
}

function LoggedItemRow({ item }: { item: RecurringItem }) {
  return (
    <ThemedView style={styles.itemRow}>
      <ThemedView style={styles.itemRowInfo}>
        <ThemedText type="default">{item.name}</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          {CATEGORY_LABELS[item.category]}
        </ThemedText>
      </ThemedView>
      <ThemedText type="small" themeColor="success">
        ✓ Logged
      </ThemedText>
    </ThemedView>
  );
}

function MonthlyItemRow({
  item,
  isLogged,
  onLog,
}: {
  item: RecurringItem;
  isLogged: boolean;
  onLog: (amount: number) => Promise<void>;
}) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(item.default_amount));
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = async () => {
    const parsed = Number(amount);
    if (Number.isNaN(parsed) || parsed < 0) return;
    setIsSaving(true);
    await onLog(parsed);
    setIsSaving(false);
    setEditing(false);
  };

  return (
    <ThemedView style={styles.monthlyRowContainer}>
      <ThemedView style={styles.itemRow}>
        <ThemedView style={styles.itemRowInfo}>
          <ThemedText type="default">{item.name}</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {CATEGORY_LABELS[item.category]} · usually {formatINR(item.default_amount)}
          </ThemedText>
        </ThemedView>
        {isLogged ? (
          <ThemedText type="small" themeColor="success">
            ✓ Logged
          </ThemedText>
        ) : editing ? null : (
          <Pressable onPress={() => setEditing(true)}>
            <ThemedText type="smallBold" themeColor="primary">
              Log
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>
      {editing && !isLogged && (
        <ThemedView style={styles.editRow}>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={[styles.amountInput, { borderColor: theme.border, color: theme.text, flex: 1 }]}
          />
          <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} style={styles.smallButton} />
          <Button title="Confirm" onPress={handleConfirm} isLoading={isSaving} style={styles.smallButton} />
        </ThemedView>
      )}
    </ThemedView>
  );
}

function BufferSpendCard({
  bufferRemaining,
  bufferAllotted,
  onSetAllotment,
  onSubmit,
  onLogged,
}: {
  bufferRemaining: number | undefined;
  bufferAllotted: number | null;
  onSetAllotment: (amount: number) => Promise<{ error: string | null }>;
  onSubmit: (amount: number, note: string) => Promise<{ error: string | null }>;
  onLogged: () => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [allotmentModalVisible, setAllotmentModalVisible] = useState(false);

  const status = getBufferStatus(bufferRemaining ?? 0, bufferAllotted ?? 0);
  const statusLabel = bufferStatusLabel(status);

  const handleSubmit = async () => {
    const parsed = Number(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      Alert.alert('Enter an amount', 'How much did you spend?');
      return;
    }
    setIsSaving(true);
    const { error } = await onSubmit(parsed, note);
    setIsSaving(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setAmount('');
    setNote('');
    await onLogged();

    // Warn on the spend that crosses the line, not on every later one.
    if (bufferAllotted !== null && bufferRemaining !== undefined) {
      const before = getBufferStatus(bufferRemaining, bufferAllotted);
      const after = getBufferStatus(bufferRemaining - parsed, bufferAllotted);
      if (after !== before && (after === 'low' || after === 'over')) {
        const left = bufferRemaining - parsed;
        notifyBufferStatus(after, left);
        Alert.alert(
          after === 'over' ? 'Over your buffer' : 'Buffer running low',
          after === 'over'
            ? `That puts you ${formatINR(Math.abs(left))} past this month's buffer.`
            : `${formatINR(left)} left in this month's buffer.`
        );
      }
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.bufferCard}>
      <ThemedView style={styles.bufferHeader}>
        <ThemedText type="smallBold">Buffer spend</ThemedText>
        <Pressable onPress={() => setAllotmentModalVisible(true)}>
          {bufferAllotted === null ? (
            <ThemedText type="smallBold" themeColor="primary">
              Set buffer
            </ThemedText>
          ) : (
            <ThemedText
              type="small"
              themeColor={status === 'healthy' ? 'textSecondary' : bufferStatusColor(status)}>
              {formatINR(bufferRemaining ?? 0)} of {formatINR(bufferAllotted)} left
            </ThemedText>
          )}
        </Pressable>
      </ThemedView>
      <ThemedText
        themeColor={
          bufferAllotted !== null && statusLabel ? bufferStatusColor(status) : 'textSecondary'
        }
        type="small">
        {bufferAllotted === null
          ? 'Set a monthly buffer for ice cream, Maggi and random cravings.'
          : (statusLabel ?? 'Ice cream, Maggi, random cravings — log it here.')}
      </ThemedText>
      <View style={styles.bufferInputRow}>
        <FormField
          label=""
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="₹ amount"
          style={styles.bufferAmountInput}
        />
        <FormField label="" value={note} onChangeText={setNote} placeholder="What for? (optional)" style={styles.flex1} />
      </View>
      <Button title="Log buffer spend" onPress={handleSubmit} isLoading={isSaving} />

      <SetBufferModal
        visible={allotmentModalVisible}
        currentAmount={bufferAllotted}
        onClose={() => setAllotmentModalVisible(false)}
        onSubmit={onSetAllotment}
        onSaved={onLogged}
      />
    </ThemedView>
  );
}

function SetBufferModal({
  visible,
  currentAmount,
  onClose,
  onSubmit,
  onSaved,
}: {
  visible: boolean;
  currentAmount: number | null;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<{ error: string | null }>;
  onSaved: () => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Prefill with the amount already set for this month, so reopening the modal
  // is an edit rather than starting from blank.
  useEffect(() => {
    if (visible) {
      setAmount(currentAmount === null ? '' : String(currentAmount));
      setError(null);
    }
  }, [visible, currentAmount]);

  const handleSubmit = async () => {
    const parsed = Number(amount);
    if (!amount || Number.isNaN(parsed) || parsed < 0) {
      setError('Enter a valid amount.');
      return;
    }
    setIsSaving(true);
    const { error: submitError } = await onSubmit(parsed);
    setIsSaving(false);
    if (submitError) {
      setError(submitError);
    } else {
      await onSaved();
      onClose();
    }
  };

  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long' });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.modalContent}>
            <ThemedText type="title" style={styles.modalTitle}>
              Buffer for {monthLabel}
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Money set aside for unplanned treats, kept separate from your fixed
              expenses so you know what is safe to spend.
            </ThemedText>

            <FormField
              label="Amount (₹)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="e.g. 500"
            />

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
  container: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  title: { fontSize: 28, lineHeight: 34 },
  section: { gap: Spacing.two },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  itemRowInfo: { flex: 1, gap: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    width: 90,
    textAlign: 'right',
  },
  monthlyRowContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  smallButton: { paddingHorizontal: Spacing.three },
  bufferCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  bufferHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bufferInputRow: { flexDirection: 'row', gap: Spacing.two },
  bufferAmountInput: { width: 110 },
  modalContent: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  modalTitle: { fontSize: 24, lineHeight: 30, marginBottom: Spacing.two },
  modalActions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three },
});
