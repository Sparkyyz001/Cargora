-- =============================================
-- МИГРАЦИЯ: доступ диспетчера и перевозчика к заказам
-- Запусти этот файл в Supabase SQL Editor.
-- Без неё диспетчер под другим аккаунтом НЕ видит чужие заявки
-- (политики orders разрешают только свои строки).
-- =============================================

-- Диспетчеры и перевозчики видят ВСЕ заказы (входящие заявки)
drop policy if exists "orders: dispatcher read" on public.orders;
create policy "orders: dispatcher read" on public.orders
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('dispatcher', 'carrier')
    )
  );

-- Диспетчеры и перевозчики могут менять статус любого заказа (принять заявку)
drop policy if exists "orders: dispatcher update" on public.orders;
create policy "orders: dispatcher update" on public.orders
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('dispatcher', 'carrier')
    )
  );

-- Realtime: чтобы заявка прилетала диспетчеру мгновенно (без него
-- сработает резервный опрос раз в 2.5 сек, так что строка не критична)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- Готово. Проверь политики:
-- select policyname from pg_policies where tablename = 'orders';
