import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getMonthRange } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { IncomeLog, IncomeSource } from '@/types/database';

export function useIncome() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<IncomeLog[]>([]);
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

    const { data, error: fetchError } = await supabase
      .from('income_logs')
      .select('*')
      .gte('received_at', start)
      .lte('received_at', end)
      .order('received_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setEntries(data ?? []);
      setError(null);
    }
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addIncome = useCallback(
    async (input: {
      source: IncomeSource;
      amount: number;
      received_at: string;
      is_recurring: boolean;
    }) => {
      if (!session) return { error: 'Not signed in' };
      const { error: insertError } = await supabase
        .from('income_logs')
        .insert({ ...input, user_id: session.user.id });
      if (insertError) return { error: insertError.message };
      await refresh();
      return { error: null };
    },
    [session, refresh]
  );

  const removeIncome = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('income_logs').delete().eq('id', id);
      if (!deleteError) await refresh();
      return { error: deleteError?.message ?? null };
    },
    [refresh]
  );

  const total = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);

  return { entries, total, isLoading, error, refresh, addIncome, removeIncome };
}
