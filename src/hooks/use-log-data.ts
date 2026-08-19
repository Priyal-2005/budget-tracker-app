import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getMonthRange, todayISODate } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { ExpenseCategory, RecurringItem } from '@/types/database';

export function useLogData() {
  const { session } = useAuth();
  const [weeklyItems, setWeeklyItems] = useState<RecurringItem[]>([]);
  const [monthlyItems, setMonthlyItems] = useState<RecurringItem[]>([]);
  const [loggedMonthlyItemIds, setLoggedMonthlyItemIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    const { start, end } = getMonthRange();

    const [itemsRes, monthLogsRes] = await Promise.all([
      supabase.from('recurring_items').select('*').eq('is_active', true).order('name'),
      supabase
        .from('expense_logs')
        .select('recurring_item_id')
        .not('recurring_item_id', 'is', null)
        .gte('logged_at', start)
        .lte('logged_at', end),
    ]);

    const firstError = itemsRes.error ?? monthLogsRes.error;
    if (firstError) {
      setError(firstError.message);
      setIsLoading(false);
      return;
    }

    const allItems = itemsRes.data ?? [];
    setWeeklyItems(allItems.filter((item) => item.frequency === 'weekly'));
    setMonthlyItems(allItems.filter((item) => item.frequency === 'monthly'));
    setLoggedMonthlyItemIds(new Set((monthLogsRes.data ?? []).map((row) => row.recurring_item_id as string)));
    setError(null);
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  return {
    weeklyItems,
    monthlyItems,
    loggedMonthlyItemIds,
    isLoading,
    error,
    refresh,
    logItems,
    logBufferSpend,
  };
}
