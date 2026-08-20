import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getRecentMonths, monthKeyOf } from '@/lib/date';
import { supabase } from '@/lib/supabase';

export const TREND_MONTHS = 6;

export interface MonthTotals {
  monthKey: string;
  label: string;
  income: number;
  spend: number;
  savings: number;
}

export function useMonthlyTrend() {
  const { session } = useAuth();
  const [trend, setTrend] = useState<MonthTotals[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    const { months, start, end } = getRecentMonths(TREND_MONTHS);

    const [incomeRes, expenseRes] = await Promise.all([
      supabase.from('income_logs').select('received_at, amount').gte('received_at', start).lte('received_at', end),
      supabase.from('expense_logs').select('logged_at, amount').gte('logged_at', start).lte('logged_at', end),
    ]);

    const firstError = incomeRes.error ?? expenseRes.error;
    if (firstError) {
      setError(firstError.message);
      setIsLoading(false);
      return;
    }

    const income = new Map<string, number>();
    for (const row of incomeRes.data ?? []) {
      const key = monthKeyOf(row.received_at);
      income.set(key, (income.get(key) ?? 0) + Number(row.amount));
    }

    // Fixed and buffer spending together — this view is about what left the
    // wallet each month, not which pot it came from.
    const spend = new Map<string, number>();
    for (const row of expenseRes.data ?? []) {
      const key = monthKeyOf(row.logged_at);
      spend.set(key, (spend.get(key) ?? 0) + Number(row.amount));
    }

    setTrend(
      months.map((month) => {
        const monthIncome = income.get(month.monthKey) ?? 0;
        const monthSpend = spend.get(month.monthKey) ?? 0;
        return {
          ...month,
          income: monthIncome,
          spend: monthSpend,
          savings: monthIncome - monthSpend,
        };
      })
    );
    setError(null);
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { trend, isLoading, error, refresh };
}
