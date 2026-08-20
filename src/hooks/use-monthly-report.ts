import { useCallback } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getMonthRange } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { ExpenseCategory, IncomeSource } from '@/types/database';

export interface ReportEntry {
  id: string;
  label: string;
  category: ExpenseCategory;
  amount: number;
  loggedAt: string;
}

export interface MonthlyReport {
  monthLabel: string;
  incomeBySource: { source: IncomeSource; amount: number }[];
  expensesByCategory: { category: ExpenseCategory; amount: number }[];
  fixedEntries: ReportEntry[];
  bufferEntries: ReportEntry[];
  totalIncome: number;
  totalFixed: number;
  bufferAllotted: number;
  bufferSpent: number;
  savings: number;
}

export function useMonthlyReport() {
  const { session } = useAuth();

  const build = useCallback(async (): Promise<{ report: MonthlyReport | null; error: string | null }> => {
    if (!session) return { report: null, error: 'Not signed in' };
    const { start, end, monthKey } = getMonthRange();

    const [incomeRes, expenseRes, bufferRes] = await Promise.all([
      supabase.from('income_logs').select('source, amount').gte('received_at', start).lte('received_at', end),
      // The item name lives on recurring_items, so it is joined in to name each
      // line rather than showing a bare category.
      supabase
        .from('expense_logs')
        .select('id, category, amount, type, logged_at, note, recurring_items(name)')
        .gte('logged_at', start)
        .lte('logged_at', end)
        .order('logged_at', { ascending: true }),
      supabase.from('monthly_buffers').select('allotted_amount').eq('month', monthKey).maybeSingle(),
    ]);

    const firstError = incomeRes.error ?? expenseRes.error ?? bufferRes.error;
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

    // Supabase types the joined relation as an array; a log points at one item.
    const nameOf = (row: (typeof expenseRows)[number]) => {
      const joined = row.recurring_items as unknown as { name: string } | { name: string }[] | null;
      const item = Array.isArray(joined) ? joined[0] : joined;
      return item?.name ?? row.note ?? null;
    };

    const toEntry = (row: (typeof expenseRows)[number], fallback: string): ReportEntry => ({
      id: row.id as string,
      label: nameOf(row) ?? fallback,
      category: row.category as ExpenseCategory,
      amount: Number(row.amount),
      loggedAt: row.logged_at as string,
    });

    return {
      report: {
        monthLabel: new Date(start).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        incomeBySource: [...incomeTotals.entries()]
          .map(([source, amount]) => ({ source, amount }))
          .sort((a, b) => b.amount - a.amount),
        expensesByCategory: [...expenseTotals.entries()]
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount),
        fixedEntries: expenseRows
          .filter((row) => row.type === 'fixed')
          .map((row) => toEntry(row, 'Item')),
        bufferEntries: expenseRows
          .filter((row) => row.type === 'buffer')
          .map((row) => toEntry(row, 'Buffer spend')),
        totalIncome,
        totalFixed,
        bufferAllotted,
        bufferSpent,
        savings: totalIncome - totalFixed - bufferSpent,
      },
      error: null,
    };
  }, [session]);

  return { build };
}
