-- Drops the 'hostel_rent' and 'mess' expense categories.
--
-- Only needed if you already ran 0001_init.sql before these categories were
-- removed; a fresh setup from the current 0001 never creates them. Postgres
-- has no "alter type ... drop value", so the enum is recreated and the columns
-- are moved across. Any rows still using the two categories become 'other'.
--
-- Run in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter type expense_category rename to expense_category_old;

create type expense_category as enum (
  'groceries', 'medicines', 'stationery',
  'subscriptions', 'travel', 'canteen', 'other'
);

alter table recurring_items
  alter column category drop default,
  alter column category type expense_category
    using (
      case when category::text in ('hostel_rent', 'mess') then 'other'
           else category::text end
    )::expense_category,
  alter column category set default 'other';

alter table expense_logs
  alter column category drop default,
  alter column category type expense_category
    using (
      case when category::text in ('hostel_rent', 'mess') then 'other'
           else category::text end
    )::expense_category,
  alter column category set default 'other';

drop type expense_category_old;
