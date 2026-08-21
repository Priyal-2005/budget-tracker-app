import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getCompletedMonths, monthKeyOf } from '@/lib/date';
import { computeIncomeAverage, type IncomeAverage } from '@/lib/income-average';
import { supabase } from '@/lib/supabase';
import type { IncomeSource } from '@/types/database';

export const AVERAGE_MONTHS = 3;

// Pocket money tends to arrive on a schedule; internship and freelance money
// is the part that swings, so it is the part worth averaging.
const VARIABLE_SOURCES: IncomeSource[] = ['internship', 'freelance'];


export function useIncomeAverage() {
  const { session } = useAuth();
  const [average, setAverage] = useState<IncomeAverage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      // Leaving isLoading true here would strand the screen on a blank state
      // with nothing to explain it.
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { monthKeys, start, end } = getCompletedMonths(AVERAGE_MONTHS);

    const [windowRes, firstRes] = await Promise.all([
      supabase
        .from('income_logs')
        .select('amount')
        .in('source', VARIABLE_SOURCES)
        .gte('received_at', start)
        .lte('received_at', end),
      // Months before the first ever entry are not months of zero earnings,
      // they are months the app was not being used — averaging over them would
      // understate a normal month.
      supabase
        .from('income_logs')
        .select('received_at')
        .in('source', VARIABLE_SOURCES)
        .order('received_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    if (windowRes.error || firstRes.error) {
      setAverage(null);
      setIsLoading(false);
      return;
    }

    setAverage(
      computeIncomeAverage({
        monthKeys,
        firstMonth: firstRes.data ? monthKeyOf(firstRes.data.received_at) : null,
        total: (windowRes.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0),
      })
    );
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    refresh();
  }, []);

  return { average, isLoading, refresh };
}
