import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getMonthRange, getWeekRange, todayISODate } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { ExpenseCategory, RecurringItem } from '@/types/database';

/** The log row an item was recorded on, so a mistyped amount can be corrected. */
export interface LoggedEntry {
  logId: string;
  amount: number;
}

type LoggedMap = Map<string, LoggedEntry>;

function toLoggedMap(rows: { id: string; recurring_item_id: string | null; amount: number }[]) {
  const map: LoggedMap = new Map();
  for (const row of rows) {
    if (!row.recurring_item_id) continue;
    map.set(row.recurring_item_id, { logId: row.id, amount: Number(row.amount) });
  }
  return map;
}

export function useLogData() {
  const { session } = useAuth();
  const [weeklyItems, setWeeklyItems] = useState<RecurringItem[]>([]);
  const [monthlyItems, setMonthlyItems] = useState<RecurringItem[]>([]);
  const [loggedMonthly, setLoggedMonthly] = useState<LoggedMap>(new Map());
  const [loggedWeekly, setLoggedWeekly] = useState<LoggedMap>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      // Leaving isLoading true here would strand the screen on a blank state
      // with nothing to explain it.
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { start, end } = getMonthRange();

    const week = getWeekRange();

    const [itemsRes, monthLogsRes, weekLogsRes] = await Promise.all([
      supabase.from('recurring_items').select('*').eq('is_active', true).order('name'),
      supabase
        .from('expense_logs')
        .select('id, recurring_item_id, amount')
        .not('recurring_item_id', 'is', null)
        .gte('logged_at', start)
        .lte('logged_at', end),
      supabase
        .from('expense_logs')
        .select('id, recurring_item_id, amount')
        .not('recurring_item_id', 'is', null)
        .gte('logged_at', week.start)
        .lte('logged_at', week.end),
    ]);

    const firstError = itemsRes.error ?? monthLogsRes.error ?? weekLogsRes.error;
    if (firstError) {
      setError(firstError.message);
      setIsLoading(false);
      return;
    }

    const allItems = itemsRes.data ?? [];
    setWeeklyItems(allItems.filter((item) => item.frequency === 'weekly'));
    setMonthlyItems(allItems.filter((item) => item.frequency === 'monthly'));
    setLoggedMonthly(toLoggedMap(monthLogsRes.data ?? []));
    setLoggedWeekly(toLoggedMap(weekLogsRes.data ?? []));
    setError(null);
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  const logItems = useCallback(
    async (entries: { recurring_item_id: string; amount: number; category: ExpenseCategory }[]) => {
      if (!session || entries.length === 0) return { error: null };
      const rows = entries.map((entry) => ({
        ...entry,
        user_id: session.user.id,
        type: 'fixed' as const,
        logged_at: todayISODate(),
      }));
      const { error: insertError } = await supabase.from('expense_logs').insert(rows);
      if (!insertError) await refresh();
      return { error: insertError?.message ?? null };
    },
    [session, refresh]
  );

  const logBufferSpend = useCallback(
    async (amount: number, note: string) => {
      if (!session) return { error: 'Not signed in' };
      const { error: insertError } = await supabase.from('expense_logs').insert({
        user_id: session.user.id,
        amount,
        category: 'other',
        type: 'buffer',
        logged_at: todayISODate(),
        note: note.trim() || null,
      });
      if (!insertError) await refresh();
      return { error: insertError?.message ?? null };
    },
    [session, refresh]
  );

  const updateLoggedAmount = useCallback(
    async (logId: string, amount: number) => {
      const { error: updateError } = await supabase
        .from('expense_logs')
        .update({ amount })
        .eq('id', logId);
      if (!updateError) await refresh();
      return { error: updateError?.message ?? null };
    },
    [refresh]
  );

  // Removing the log leaves the recurring item alone — it just becomes
  // unlogged again, ready to be recorded properly.
  const removeLoggedEntry = useCallback(
    async (logId: string) => {
      const { error: deleteError } = await supabase.from('expense_logs').delete().eq('id', logId);
      if (!deleteError) await refresh();
      return { error: deleteError?.message ?? null };
    },
    [refresh]
  );

  return {
    weeklyItems,
    monthlyItems,
    loggedMonthly,
    loggedWeekly,
    isLoading,
    error,
    refresh,
    logItems,
    logBufferSpend,
    updateLoggedAmount,
    removeLoggedEntry,
  };
}
