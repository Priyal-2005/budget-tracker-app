import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getMonthRange } from '@/lib/date';
import { supabase } from '@/lib/supabase';

export interface MonthlySummary {
  totalIncome: number;
  totalFixed: number;
  bufferAllotted: number;
  bufferSpent: number;
  bufferRemaining: number;
  savings: number;
}

export function useMonthlySummary() {
  const { session } = useAuth();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
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
    setError(null);
    const { start, end, monthKey } = getMonthRange();

    const [incomeRes, expenseRes, bufferRes] = await Promise.all([
      supabase.from('income_logs').select('amount').gte('received_at', start).lte('received_at', end),
      supabase.from('expense_logs').select('amount, type').gte('logged_at', start).lte('logged_at', end),
      supabase.from('monthly_buffers').select('allotted_amount').eq('month', monthKey).maybeSingle(),
    ]);

    const firstError = incomeRes.error ?? expenseRes.error ?? bufferRes.error;
    if (firstError) {
      setError(firstError.message);
      setIsLoading(false);
      return;
    }

    const totalIncome = (incomeRes.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
    const totalFixed = (expenseRes.data ?? [])
      .filter((row) => row.type === 'fixed')
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const bufferSpent = (expenseRes.data ?? [])
      .filter((row) => row.type === 'buffer')
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const bufferAllotted = Number(bufferRes.data?.allotted_amount ?? 0);

    setSummary({
      totalIncome,
      totalFixed,
      bufferAllotted,
      bufferSpent,
      bufferRemaining: bufferAllotted - bufferSpent,
      savings: totalIncome - totalFixed - bufferSpent,
    });
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  return { summary, isLoading, error, refresh };
}
