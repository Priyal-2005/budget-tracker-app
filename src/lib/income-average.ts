export interface IncomeAverage {
  monthlyAverage: number;
  monthsCounted: number;
}

export function computeIncomeAverage({
  monthKeys,
  firstMonth,
  total,
}: {
  monthKeys: string[];
  firstMonth: string | null;
  total: number;
}): IncomeAverage | null {
  if (!firstMonth) return null;

  // Months before the first ever entry are not months of zero earnings, they
  // are months the app was not being used — averaging over them would
  // understate what a normal month looks like.
  const monthsCounted = monthKeys.filter((month) => month >= firstMonth).length;
  if (monthsCounted === 0) return null;

  return { monthlyAverage: total / monthsCounted, monthsCounted };
}
