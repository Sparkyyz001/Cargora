-- =============================================
-- МИГРАЦИЯ: расширенные данные заказа
-- (дата доставки, отправитель, получатель)
-- Запусти этот файл в Supabase SQL Editor.
-- Безопасно — не трогает существующие данные.
-- =============================================

alter table public.orders add column if not exists delivery_date    date;
alter table public.orders add column if not exists sender_name      text;
alter table public.orders add column if not exists sender_phone     text;
alter table public.orders add column if not exists sender_address   text;
alter table public.orders add column if not exists recipient_name   text;
alter table public.orders add column if not exists recipient_phone  text;
alter table public.orders add column if not exists recipient_address text;

-- Готово. Проверь что колонки появились:
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'orders';
