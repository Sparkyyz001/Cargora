-- =============================================
-- МИГРАЦИЯ: добавляем выбор роли при регистрации
-- Запусти этот файл в Supabase SQL Editor.
-- Безопасно — не трогает существующие данные и политики.
-- =============================================

-- 1. Добавляем колонки в profiles (если их ещё нет)
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role      text;

-- 2. Добавляем CHECK constraint на role (если его ещё нет)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('sender', 'carrier', 'dispatcher', 'driver'));
  end if;
end $$;

-- 3. Обновляем триггер — теперь он автоматически записывает
--    full_name и role из метаданных пользователя при регистрации
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'role'
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name),
        role      = coalesce(excluded.role,      public.profiles.role);
  return new;
end;
$$;

-- 4. Пересоздаём триггер (на случай если он отсутствовал)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Готово. Проверь что колонки появились:
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'profiles';
