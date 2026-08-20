import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { SavingsGoal } from '@/types/database';

export function useSavingsGoals() {
  const { session } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    const { data, error: fetchError } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setGoals(data ?? []);
      setError(null);
    }
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addGoal = useCallback(
    async (input: { name: string; target_amount: number; target_date: string | null }) => {
      if (!session) return { error: 'Not signed in' };
      const { error: insertError } = await supabase
        .from('savings_goals')
        .insert({ ...input, user_id: session.user.id });
      if (insertError) return { error: insertError.message };
      await refresh();
      return { error: null };
    },
    [session, refresh]
  );

  const contribute = useCallback(
    async (goal: SavingsGoal, amount: number) => {
      const next = Number(goal.current_amount) + amount;
      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: next })
        .eq('id', goal.id);
      if (updateError) return { error: updateError.message };
      await refresh();
      return { error: null };
    },
    [refresh]
  );

  const removeGoal = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('savings_goals').delete().eq('id', id);
      if (!deleteError) await refresh();
      return { error: deleteError?.message ?? null };
    },
    [refresh]
  );

  return { goals, isLoading, error, refresh, addGoal, contribute, removeGoal };
}
