import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getMonthRange } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { ExpenseLog } from '@/types/database';

export function useBufferSpends() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<ExpenseLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { start, end } = getMonthRange();

    const { data, error: fetchError } = await supabase
      .from('expense_logs')
      .select('*')
      .eq('type', 'buffer')
      .gte('logged_at', start)
      .lte('logged_at', end)
      .order('logged_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setEntries(data ?? []);
      setError(null);
    }
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  const removeSpend = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('expense_logs').delete().eq('id', id);
      if (!deleteError) await refresh();
      return { error: deleteError?.message ?? null };
    },
    [refresh]
  );

  return { entries, isLoading, error, refresh, removeSpend };
}
