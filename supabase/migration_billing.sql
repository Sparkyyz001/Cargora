-- =============================================
-- МИГРАЦИЯ: тариф и оплата (подписки + история платежей)
-- Запусти этот файл в Supabase SQL Editor.
-- Безопасно — не трогает существующие таблицы и политики.
-- =============================================

-- 1. Подписка пользователя (одна на аккаунт)
create table if not exists public.subscriptions (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  plan               text not null check (plan in ('sender', 'carrier')),
  status             text not null default 'active' check (status in ('active', 'canceled')),
  price              integer not null,
  card_brand         text,
  card_last4         text,
  started_at         timestamptz not null default now(),
  current_period_end timestamptz not null
);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own" on public.subscriptions
  for update using (auth.uid() = user_id);

drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_delete_own" on public.subscriptions
  for delete using (auth.uid() = user_id);

-- 2. История платежей
create table if not exists public.payments (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan    text not null,
  amount  integer not null,
  status  text not null default 'paid',
  paid_at timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);

-- Готово. Проверь что таблицы появились:
-- select table_name from information_schema.tables
-- where table_schema = 'public' and table_name in ('subscriptions', 'payments');
