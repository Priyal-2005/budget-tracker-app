import { useCallback } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getMonthRange } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { ExpenseCategory, IncomeSource, SavingsGoal } from '@/types/database';

export interface MonthlyReport {
  monthLabel: string;
  incomeBySource: { source: IncomeSource; amount: number }[];
  expensesByCategory: { category: ExpenseCategory; amount: number }[];
  totalIncome: number;
  totalFixed: number;
  bufferAllotted: number;
  bufferSpent: number;
  savings: number;
  goals: SavingsGoal[];
}

export function useMonthlyReport() {
  const { session } = useAuth();

  const build = useCallback(async (): Promise<{ report: MonthlyReport | null; error: string | null }> => {
    if (!session) return { report: null, error: 'Not signed in' };
    const { start, end, monthKey } = getMonthRange();

    const [incomeRes, expenseRes, bufferRes, goalsRes] = await Promise.all([
      supabase.from('income_logs').select('source, amount').gte('received_at', start).lte('received_at', end),
      supabase.from('expense_logs').select('category, amount, type').gte('logged_at', start).lte('logged_at', end),
      supabase.from('monthly_buffers').select('allotted_amount').eq('month', monthKey).maybeSingle(),
      supabase.from('savings_goals').select('*').order('created_at', { ascending: true }),
    ]);

    const firstError = incomeRes.error ?? expenseRes.error ?? bufferRes.error ?? goalsRes.error;
    if (firstError) return { report: null, error: firstError.message };

    const incomeRows = incomeRes.data ?? [];
    const expenseRows = expenseRes.data ?? [];

    const incomeTotals = new Map<IncomeSource, number>();
    for (const row of incomeRows) {
      const source = row.source as IncomeSource;
      incomeTotals.set(source, (incomeTotals.get(source) ?? 0) + Number(row.amount));
    }

    const expenseTotals = new Map<ExpenseCategory, number>();
    for (const row of expenseRows) {
      if (row.type !== 'fixed') continue;
      const category = row.category as ExpenseCategory;
      expenseTotals.set(category, (expenseTotals.get(category) ?? 0) + Number(row.amount));
    }

    const totalIncome = incomeRows.reduce((sum, row) => sum + Number(row.amount), 0);
    const totalFixed = expenseRows
      .filter((row) => row.type === 'fixed')
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const bufferSpent = expenseRows
      .filter((row) => row.type === 'buffer')
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const bufferAllotted = Number(bufferRes.data?.allotted_amount ?? 0);

    return {
      report: {
        monthLabel: new Date(start).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        incomeBySource: [...incomeTotals.entries()]
          .map(([source, amount]) => ({ source, amount }))
          .sort((a, b) => b.amount - a.amount),
        expensesByCategory: [...expenseTotals.entries()]
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount),
        totalIncome,
        totalFixed,
        bufferAllotted,
        bufferSpent,
        savings: totalIncome - totalFixed - bufferSpent,
        goals: goalsRes.data ?? [],
      },
      error: null,
    };
  }, [session]);

  return { build };
}
