-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query
-- -> paste this whole file -> Run.

-- ── Enums ─────────────────────────────────────────────────────────────────

create type expense_category as enum (
  'hostel_rent', 'mess', 'groceries', 'medicines', 'stationery',
  'subscriptions', 'travel', 'canteen', 'other'
);

create type item_frequency as enum ('daily', 'weekly', 'monthly');

create type income_source as enum ('pocket_money', 'internship', 'freelance');

create type expense_type as enum ('fixed', 'buffer');

-- ── Profiles ──────────────────────────────────────────────────────────────
-- One row per auth user, created automatically on signup (see trigger below).

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Recurring items (the weekly/monthly library: milk, medicines, etc.) ────

create table recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category expense_category not null default 'other',
  default_amount numeric(10,2) not null check (default_amount >= 0),
  frequency item_frequency not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table recurring_items enable row level security;

create policy "Users manage own recurring items"
  on recurring_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index recurring_items_user_id_idx on recurring_items(user_id);

-- ── Expense logs (actual logged spends: weekly batch + buffer spends) ──────

create table expense_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recurring_item_id uuid references recurring_items(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  category expense_category not null default 'other',
  type expense_type not null default 'fixed',
  logged_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

alter table expense_logs enable row level security;

create policy "Users manage own expense logs"
  on expense_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index expense_logs_user_id_logged_at_idx on expense_logs(user_id, logged_at);

-- ── Income logs (pocket money / internship / freelance) ─────────────────────

create table income_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source income_source not null,
  amount numeric(10,2) not null check (amount >= 0),
  received_at date not null default current_date,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

alter table income_logs enable row level security;

create policy "Users manage own income logs"
  on income_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index income_logs_user_id_received_at_idx on income_logs(user_id, received_at);

-- ── Monthly buffer allotment ─────────────────────────────────────────────
-- One row per user per month. Buffer *spends* live in expense_logs (type='buffer');
-- this table just holds how much was set aside for that month.

create table monthly_buffers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  allotted_amount numeric(10,2) not null check (allotted_amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table monthly_buffers enable row level security;

create policy "Users manage own buffer"
  on monthly_buffers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Savings goals ────────────────────────────────────────────────────────

create table savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(10,2) not null check (target_amount > 0),
  current_amount numeric(10,2) not null default 0 check (current_amount >= 0),
  target_date date,
  created_at timestamptz not null default now()
);

alter table savings_goals enable row level security;

create policy "Users manage own savings goals"
  on savings_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
