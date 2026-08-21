import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/progress-bar';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useBuffer } from '@/hooks/use-buffer';
import { useBufferSpends } from '@/hooks/use-buffer-spends';
import { useLogData, type LoggedEntry } from '@/hooks/use-log-data';
import { useMonthlySummary } from '@/hooks/use-monthly-summary';
import { useTheme } from '@/hooks/use-theme';
import { bufferStatusColor, bufferStatusLabel, getBufferStatus } from '@/lib/buffer-status';
import { formatINR } from '@/lib/currency';
import { notifyBufferStatus } from '@/lib/notify';
import { CATEGORY_LABELS, type ExpenseLog, type RecurringItem } from '@/types/database';

// seededFrom records the item's usual amount at the time the row was filled
// in, so an edited price can be told apart from a figure the user typed.
type WeeklyState = Record<string, { checked: boolean; amount: string; seededFrom: number }>;

export default function LogScreen() {
  const {
    weeklyItems,
    monthlyItems,
    loggedMonthly,
    loggedWeekly,
    error,
    refresh,
    logItems,
    logBufferSpend,
    updateLoggedAmount,
    removeLoggedEntry,
  } = useLogData();
  const { summary, refresh: refreshSummary } = useMonthlySummary();
  const { allotted, refresh: refreshBuffer, setAllotment } = useBuffer();
  const { entries: bufferSpends, refresh: refreshBufferSpends, removeSpend } = useBufferSpends();
  const theme = useTheme();

  // Items added on the Items tab, and buffer spent elsewhere, need to show up
  // here without a full app restart.
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshSummary();
      refreshBuffer();
      refreshBufferSpends();
    }, [refresh, refreshSummary, refreshBuffer, refreshBufferSpends])
  );

  const [weeklyState, setWeeklyState] = useState<WeeklyState>({});
  const [isSubmittingWeekly, setIsSubmittingWeekly] = useState(false);

  useEffect(() => {
    setWeeklyState((prev) => {
      const next = { ...prev };
      for (const item of weeklyItems) {
        const existing = next[item.id];
        // Re-fill when the item's usual amount changes, so editing a price on
        // the Items tab is reflected here instead of logging the old figure.
        if (!existing || existing.seededFrom !== item.default_amount) {
          next[item.id] = {
            checked: existing?.checked ?? true,
            amount: String(item.default_amount),
            seededFrom: item.default_amount,
          };
        }
      }
      return next;
    });
  }, [weeklyItems]);

  // Anything already logged this week is excluded, so tapping the button twice
  // cannot quietly double-count the week's shop.
  const pendingWeeklyItems = weeklyItems.filter((item) => !loggedWeekly.has(item.id));

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
    <ThemedView type="background" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <ThemedText type="screenTitle">Log</ThemedText>

          {error && (
            <ThemedText themeColor="danger" type="caption">
              {error}
            </ThemedText>
          )}

          <BufferSpendCard
            bufferRemaining={summary?.bufferRemaining}
            bufferAllotted={allotted}
            onSetAllotment={setAllotment}
            onSubmit={logBufferSpend}
            onLogged={async () => {
              await refreshSummary();
              await refreshBufferSpends();
            }}
            spends={bufferSpends}
            onRemoveSpend={async (id) => {
              const { error: removeError } = await removeSpend(id);
              if (removeError) Alert.alert('Error', removeError);
              else await refreshSummary();
            }}
          />

          <Card style={styles.section}>
            <ThemedText type="sectionLabel" themeColor="textMuted">
              This week&apos;s batch
            </ThemedText>
            {weeklyItems.length === 0 ? (
              <ThemedText type="caption" themeColor="textSecondary">
                No weekly items yet. Add some from the Items tab (milk, fruits, veggies…).
              </ThemedText>
            ) : (
              weeklyItems.map((item) =>
                loggedWeekly.has(item.id) ? (
                  <LoggedItemRow
                    key={item.id}
                    item={item}
                    entry={loggedWeekly.get(item.id)!}
                    onUpdate={updateLoggedAmount}
                    onRemove={removeLoggedEntry}
                    onChanged={refreshSummary}
                  />
                ) : (
                  <WeeklyItemRow
                    key={item.id}
                    item={item}
                    state={
                      weeklyState[item.id] ?? {
                        checked: true,
                        amount: String(item.default_amount),
                        seededFrom: item.default_amount,
                      }
                    }
                    onChange={(next) => setWeeklyState((prev) => ({ ...prev, [item.id]: next }))}
                  />
                )
              )
            )}
            {pendingWeeklyItems.length > 0 && (
              <Button title="Log this week's batch" onPress={handleLogWeek} isLoading={isSubmittingWeekly} />
            )}
            {weeklyItems.length > 0 && pendingWeeklyItems.length === 0 && (
              <ThemedText themeColor="success" type="caption" style={styles.doneLabel}>
                This week&apos;s shop is logged.
              </ThemedText>
            )}
          </Card>

          <Card style={styles.section}>
            <ThemedText type="sectionLabel" themeColor="textMuted">
              This month
            </ThemedText>
            {monthlyItems.length === 0 ? (
              <ThemedText type="caption" themeColor="textSecondary">
                No monthly items yet. Add things like medicines or subscriptions from the Items tab.
              </ThemedText>
            ) : (
              monthlyItems.map((item) => (
                <MonthlyItemRow
                  key={item.id}
                  item={item}
                  entry={loggedMonthly.get(item.id) ?? null}
                  onLog={async (amount) => {
                    const { error: logError } = await logItems([
                      { recurring_item_id: item.id, amount, category: item.category },
                    ]);
                    if (logError) Alert.alert('Error', logError);
                  }}
                  onUpdate={updateLoggedAmount}
                  onRemove={removeLoggedEntry}
                  onChanged={refreshSummary}
                />
              ))
            )}
          </Card>
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
  state: WeeklyState[string];
  onChange: (next: WeeklyState[string]) => void;
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
        <ThemedText style={styles.itemName}>{item.name}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
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
          {
            borderColor: theme.border,
            color: theme.text,
            backgroundColor: theme.background,
            opacity: state.checked ? 1 : 0.4,
          },
        ]}
      />
    </ThemedView>
  );
}

// A logged row stays editable: a mistyped amount can be corrected, and the
// whole entry removed so the item goes back to unlogged.
function LoggedItemRow({
  item,
  entry,
  onUpdate,
  onRemove,
  onChanged,
}: {
  item: RecurringItem;
  entry: LoggedEntry;
  onUpdate: (logId: string, amount: number) => Promise<{ error: string | null }>;
  onRemove: (logId: string) => Promise<{ error: string | null }>;
  onChanged: () => Promise<void>;
}) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(entry.amount));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAmount(String(entry.amount));
  }, [entry.amount]);

  const handleSave = async () => {
    const parsed = Number(amount.trim());
    if (amount.trim() === '' || !Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Enter an amount', 'How much did it actually cost?');
      return;
    }
    setIsSaving(true);
    const { error } = await onUpdate(entry.logId, parsed);
    setIsSaving(false);
    if (error) Alert.alert('Error', error);
    else {
      await onChanged();
      setEditing(false);
    }
  };

  const handleRemove = () => {
    Alert.alert('Remove entry', `Remove the ${formatINR(entry.amount)} logged for ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await onRemove(entry.logId);
          if (error) Alert.alert('Error', error);
          else await onChanged();
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.monthlyRowContainer}>
      <ThemedView style={styles.itemRow}>
        <ThemedView style={styles.itemRowInfo}>
          <ThemedText style={styles.itemName}>{item.name}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {CATEGORY_LABELS[item.category]}
          </ThemedText>
        </ThemedView>
        {editing ? null : (
          <Pressable onPress={() => setEditing(true)}>
            <ThemedText type="caption" themeColor="success" style={styles.loggedAmount}>
              {formatINR(entry.amount)} ✓
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>
      {editing && (
        <ThemedView style={styles.editRow}>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={[
              styles.amountInput,
              { borderColor: theme.border, color: theme.text, backgroundColor: theme.background, flex: 1 },
            ]}
          />
          <Button title="Remove" variant="danger" onPress={handleRemove} style={styles.smallButton} />
          <Button title="Save" onPress={handleSave} isLoading={isSaving} style={styles.smallButton} />
        </ThemedView>
      )}
    </ThemedView>
  );
}

function MonthlyItemRow({
  item,
  entry,
  onLog,
  onUpdate,
  onRemove,
  onChanged,
}: {
  item: RecurringItem;
  entry: LoggedEntry | null;
  onLog: (amount: number) => Promise<void>;
  onUpdate: (logId: string, amount: number) => Promise<{ error: string | null }>;
  onRemove: (logId: string) => Promise<{ error: string | null }>;
  onChanged: () => Promise<void>;
}) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(item.default_amount));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (entry) setAmount(String(entry.amount));
  }, [entry]);

  const handleConfirm = async () => {
    const parsed = Number(amount.trim());
    if (amount.trim() === '' || !Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Enter an amount', 'How much did it cost?');
      return;
    }
    setIsSaving(true);
    // Editing an existing entry updates it; otherwise this is the first log.
    const result = entry ? await onUpdate(entry.logId, parsed) : (await onLog(parsed), { error: null });
    setIsSaving(false);
    if (result.error) Alert.alert('Error', result.error);
    else {
      await onChanged();
      setEditing(false);
    }
  };

  const handleRemove = () => {
    if (!entry) return;
    Alert.alert('Remove entry', `Remove the ${formatINR(entry.amount)} logged for ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await onRemove(entry.logId);
          if (error) Alert.alert('Error', error);
          else {
            await onChanged();
            setEditing(false);
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.monthlyRowContainer}>
      <ThemedView style={styles.itemRow}>
        <ThemedView style={styles.itemRowInfo}>
          <ThemedText style={styles.itemName}>{item.name}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {CATEGORY_LABELS[item.category]} · usually {formatINR(item.default_amount)}
          </ThemedText>
        </ThemedView>
        {entry ? (
          <Pressable onPress={() => setEditing(true)}>
            <ThemedText type="caption" themeColor="success" style={styles.loggedAmount}>
              {formatINR(entry.amount)} ✓
            </ThemedText>
          </Pressable>
        ) : editing ? null : (
          <Pressable onPress={() => setEditing(true)} hitSlop={8}>
            <ThemedText type="caption" themeColor="primary" style={styles.logAction}>
              Log
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>
      {editing && (
        <ThemedView style={styles.editRow}>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={[
              styles.amountInput,
              { borderColor: theme.border, color: theme.text, backgroundColor: theme.background, flex: 1 },
            ]}
          />
          {entry ? (
            <Button title="Remove" variant="danger" onPress={handleRemove} style={styles.smallButton} />
          ) : (
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setEditing(false)}
              style={styles.smallButton}
            />
          )}
          <Button title="Save" onPress={handleConfirm} isLoading={isSaving} style={styles.smallButton} />
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
  spends,
  onRemoveSpend,
}: {
  bufferRemaining: number | undefined;
  bufferAllotted: number | null;
  onSetAllotment: (amount: number) => Promise<{ error: string | null }>;
  onSubmit: (amount: number, note: string) => Promise<{ error: string | null }>;
  onLogged: () => Promise<void>;
  spends: ExpenseLog[];
  onRemoveSpend: (id: string) => Promise<void>;
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

  const spent = (bufferAllotted ?? 0) - (bufferRemaining ?? 0);
  const progress = bufferAllotted && bufferAllotted > 0 ? spent / bufferAllotted : 0;

  return (
    <Card style={styles.bufferCard}>
      <ThemedView style={styles.bufferHeader}>
        <ThemedView style={styles.bufferHeadings}>
          <ThemedText style={styles.bufferTitle}>Buffer</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Ice cream, Maggi, random cravings
          </ThemedText>
        </ThemedView>
        <Pressable onPress={() => setAllotmentModalVisible(true)} hitSlop={8}>
          <ThemedText type="caption" themeColor="primary" style={styles.bufferEditAction}>
            {bufferAllotted === null ? 'Set buffer' : 'Edit'}
          </ThemedText>
        </Pressable>
      </ThemedView>

      {bufferAllotted === null ? (
        <ThemedText type="caption" themeColor="textSecondary">
          Set a monthly amount to keep treats separate from your fixed spending.
        </ThemedText>
      ) : (
        <ThemedView style={styles.bufferStatusBlock}>
          <ThemedView style={styles.bufferAmountRow}>
            <ThemedText type="metric" themeColor={bufferStatusColor(status)}>
              {formatINR(bufferRemaining ?? 0)}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              left of {formatINR(bufferAllotted)}
            </ThemedText>
          </ThemedView>
          <ProgressBar progress={progress} />
          {statusLabel && (
            <ThemedText type="caption" themeColor={bufferStatusColor(status)} style={styles.statusText}>
              {statusLabel}
            </ThemedText>
          )}
        </ThemedView>
      )}

      <ThemedView style={styles.bufferForm}>
        <FormField
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="₹ 0"
        />
        <FormField label="What for?" value={note} onChangeText={setNote} placeholder="Optional" />
        <Button title="Add spend" onPress={handleSubmit} isLoading={isSaving} />
      </ThemedView>

      {spends.length > 0 && (
        <ThemedView style={styles.spendHistory}>
          <ThemedText type="sectionLabel" themeColor="textMuted" style={styles.spendHistoryTitle}>
            This month
          </ThemedText>
          {spends.map((spend) => (
            <Pressable
              key={spend.id}
              onLongPress={() =>
                Alert.alert(
                  'Remove spend',
                  `Remove ${formatINR(Number(spend.amount))}${spend.note ? ` (${spend.note})` : ''}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => onRemoveSpend(spend.id) },
                  ]
                )
              }>
              <ThemedView style={styles.spendRow}>
                <ThemedText type="caption" themeColor="textMuted" style={styles.spendDate}>
                  {new Date(spend.logged_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </ThemedText>
                <ThemedText type="caption" style={styles.spendNote} numberOfLines={1}>
                  {spend.note || 'Buffer spend'}
                </ThemedText>
                <ThemedText style={styles.spendAmount}>{formatINR(Number(spend.amount))}</ThemedText>
              </ThemedView>
            </Pressable>
          ))}
          <ThemedText type="caption" themeColor="textMuted" style={styles.spendHint}>
            Long-press to remove
          </ThemedText>
        </ThemedView>
      )}

      <SetBufferModal
        visible={allotmentModalVisible}
        currentAmount={bufferAllotted}
        onClose={() => setAllotmentModalVisible(false)}
        onSubmit={onSetAllotment}
        onSaved={onLogged}
      />
    </Card>
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
      <ThemedView type="background" style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Buffer for {monthLabel}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
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
  container: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  section: { gap: Spacing.two },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  itemRowInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 15, fontWeight: '600' },
  loggedAmount: { fontWeight: '700' },
  logAction: { fontWeight: '700' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
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
  doneLabel: { fontWeight: '600' },
  bufferCard: {
    gap: Spacing.three,
  },
  bufferHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bufferHeadings: { gap: 2, flex: 1 },
  bufferTitle: { fontSize: 17, fontWeight: '700' },
  bufferEditAction: { fontWeight: '700' },
  bufferStatusBlock: { gap: Spacing.two },
  bufferAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  statusText: { fontWeight: '600' },
  bufferForm: { gap: Spacing.two },
  spendHistory: { gap: Spacing.one },
  spendHistoryTitle: { marginBottom: Spacing.half },
  spendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one + 2,
  },
  spendDate: { width: 52 },
  spendNote: { flex: 1 },
  spendAmount: { fontSize: 14, fontWeight: '700' },
  spendHint: { textAlign: 'center', marginTop: Spacing.half },
  modalContent: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  modalTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', marginBottom: Spacing.one },
  modalActions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three },
});
