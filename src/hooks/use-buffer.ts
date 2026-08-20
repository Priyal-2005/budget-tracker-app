import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getMonthRange } from '@/lib/date';
import { supabase } from '@/lib/supabase';

export function useBuffer() {
  const { session } = useAuth();
  const [allotted, setAllotted] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      // Leaving isLoading true here would strand the screen on a blank state
      // with nothing to explain it.
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { monthKey } = getMonthRange();
    const { data } = await supabase
      .from('monthly_buffers')
      .select('allotted_amount')
      .eq('month', monthKey)
      .maybeSingle();

    setAllotted(data ? Number(data.allotted_amount) : null);
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // One buffer row per user per month, so re-setting the amount updates the
  // existing row rather than stacking up duplicates.
  const setAllotment = useCallback(
    async (amount: number) => {
      if (!session) return { error: 'Not signed in' };
      const { monthKey } = getMonthRange();
      const { error } = await supabase.from('monthly_buffers').upsert(
        {
          user_id: session.user.id,
          month: monthKey,
          allotted_amount: amount,
        },
        { onConflict: 'user_id,month' }
      );
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [session, refresh]
  );

  return { allotted, isLoading, refresh, setAllotment };
}
