import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { ExpenseCategory, ItemFrequency, RecurringItem } from '@/types/database';

export function useRecurringItems() {
  const { session } = useAuth();
  const [items, setItems] = useState<RecurringItem[]>([]);
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
    const { data, error: fetchError } = await supabase
      .from('recurring_items')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) setError(fetchError.message);
    else {
      setItems(data ?? []);
      setError(null);
    }
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (input: {
      name: string;
      category: ExpenseCategory;
      default_amount: number;
      frequency: ItemFrequency;
    }) => {
      if (!session) return { error: 'Not signed in' };
      const { error: insertError } = await supabase
        .from('recurring_items')
        .insert({ ...input, user_id: session.user.id });
      if (insertError) return { error: insertError.message };
      await refresh();
      return { error: null };
    },
    [session, refresh]
  );

  const toggleActive = useCallback(
    async (id: string, is_active: boolean) => {
      const { error: updateError } = await supabase.from('recurring_items').update({ is_active }).eq('id', id);
      if (!updateError) await refresh();
      return { error: updateError?.message ?? null };
    },
    [refresh]
  );

  const removeItem = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('recurring_items').delete().eq('id', id);
      if (!deleteError) await refresh();
      return { error: deleteError?.message ?? null };
    },
    [refresh]
  );

  return { items, isLoading, error, refresh, addItem, toggleActive, removeItem };
}
