export type ExpenseCategory =
  | 'hostel_rent'
  | 'mess'
  | 'groceries'
  | 'medicines'
  | 'stationery'
  | 'subscriptions'
  | 'travel'
  | 'canteen'
  | 'other';

export type ItemFrequency = 'daily' | 'weekly' | 'monthly';

export type IncomeSource = 'pocket_money' | 'internship' | 'freelance';

export type ExpenseType = 'fixed' | 'buffer';

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
}

export interface RecurringItem {
  id: string;
  user_id: string;
  name: string;
  category: ExpenseCategory;
  default_amount: number;
  frequency: ItemFrequency;
  is_active: boolean;
  created_at: string;
}

export interface ExpenseLog {
  id: string;
  user_id: string;
  recurring_item_id: string | null;
  amount: number;
  category: ExpenseCategory;
  type: ExpenseType;
  logged_at: string;
  note: string | null;
  created_at: string;
}

export interface IncomeLog {
  id: string;
  user_id: string;
  source: IncomeSource;
  amount: number;
  received_at: string;
  is_recurring: boolean;
  created_at: string;
}

export interface MonthlyBuffer {
  id: string;
  user_id: string;
  month: string; // first day of month, e.g. "2026-08-01"
  allotted_amount: number;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  created_at: string;
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  hostel_rent: 'Hostel/PG Rent',
  mess: 'Mess Fees',
  groceries: 'Groceries',
  medicines: 'Medicines',
  stationery: 'Stationery',
  subscriptions: 'Subscriptions',
  travel: 'Travel',
  canteen: 'Canteen',
  other: 'Other',
};

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  pocket_money: 'Pocket Money',
  internship: 'Internship',
  freelance: 'Freelance',
};
