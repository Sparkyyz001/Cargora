-- =============================================
-- Cargora — схема базы данных
-- Запусти этот файл в Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor → New query
-- =============================================

-- ──────────────────────────────────────────
-- 1. PROFILES (данные пользователя/компании)
-- ──────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text check (role in ('sender', 'carrier', 'dispatcher', 'driver')),
  company    text,
  phone      text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Миграция для существующих БД (безопасно — не падает если колонки уже есть)
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text;

-- Добавляем check constraint только если его ещё нет
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

alter table public.profiles enable row level security;

drop policy if exists "profiles: own read"   on public.profiles;
drop policy if exists "profiles: own insert" on public.profiles;
drop policy if exists "profiles: own update" on public.profiles;

create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);

-- Автоматически создаём профиль при регистрации,
-- забираем full_name и role из user_metadata (которые передаём при signUp)
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ──────────────────────────────────────────
-- 2. ORDERS (заказы)
-- ──────────────────────────────────────────
create table if not exists public.orders (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  order_number text not null,
  cargo_type   text not null default 'Стройматериалы',
  status       text not null default 'Ожидает отправки'
                check (status in ('Ожидает отправки', 'В пути', 'Доставлен',
                                  'Жіберілуді күтуде', 'Жолда', 'Жеткізілді')),
  weight       numeric(10,2),
  volume       numeric(10,2),
  driver       text,
  delivery_date     date,
  sender_name       text,
  sender_phone      text,
  sender_address    text,
  recipient_name    text,
  recipient_phone   text,
  recipient_address text,
  created_at   timestamptz default now()
);

alter table public.orders enable row level security;

drop policy if exists "orders: own read"   on public.orders;
drop policy if exists "orders: own insert" on public.orders;
drop policy if exists "orders: own update" on public.orders;
drop policy if exists "orders: own delete" on public.orders;

create policy "orders: own read"   on public.orders for select using (auth.uid() = user_id);
create policy "orders: own insert" on public.orders for insert with check (auth.uid() = user_id);
create policy "orders: own update" on public.orders for update using (auth.uid() = user_id);
create policy "orders: own delete" on public.orders for delete using (auth.uid() = user_id);

-- Демо-данные (добавятся при первом входе через триггер на profiles)
-- Можно вставить вручную для теста:
-- insert into public.orders (user_id, order_number, cargo_type, status, weight, volume, driver)
-- select id, 'ЗАК-00142', 'Стройматериалы', 'В пути', 1450, 12, 'Иванов А.С.'
-- from auth.users limit 1;


-- ──────────────────────────────────────────
-- 3. VEHICLES (автопарк)
-- ──────────────────────────────────────────
create table if not exists public.vehicles (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  vehicle_code text not null,
  plate        text,
  driver       text,
  status       text not null default 'Свободна'
                check (status in ('В рейсе', 'Свободна', 'На ТО')),
  load_percent integer default 0 check (load_percent >= 0 and load_percent <= 100),
  route        text,
  created_at   timestamptz default now()
);

alter table public.vehicles enable row level security;

drop policy if exists "vehicles: own read"   on public.vehicles;
drop policy if exists "vehicles: own insert" on public.vehicles;
drop policy if exists "vehicles: own update" on public.vehicles;
drop policy if exists "vehicles: own delete" on public.vehicles;

create policy "vehicles: own read"   on public.vehicles for select using (auth.uid() = user_id);
create policy "vehicles: own insert" on public.vehicles for insert with check (auth.uid() = user_id);
create policy "vehicles: own update" on public.vehicles for update using (auth.uid() = user_id);
create policy "vehicles: own delete" on public.vehicles for delete using (auth.uid() = user_id);


-- ──────────────────────────────────────────
-- 4. ROUTES (маршруты)
-- ──────────────────────────────────────────
create table if not exists public.routes (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  route_code  text not null,
  from_city   text not null,
  to_city     text not null,
  driver      text default '—',
  eta         text default '—',
  progress    integer default 0 check (progress >= 0 and progress <= 100),
  status      text not null default 'Запланирован'
               check (status in ('В пути', 'Завершается', 'Запланирован', 'Завершён')),
  created_at  timestamptz default now()
);

alter table public.routes enable row level security;

drop policy if exists "routes: own read"   on public.routes;
drop policy if exists "routes: own insert" on public.routes;
drop policy if exists "routes: own update" on public.routes;
drop policy if exists "routes: own delete" on public.routes;

create policy "routes: own read"   on public.routes for select using (auth.uid() = user_id);
create policy "routes: own insert" on public.routes for insert with check (auth.uid() = user_id);
create policy "routes: own update" on public.routes for update using (auth.uid() = user_id);
create policy "routes: own delete" on public.routes for delete using (auth.uid() = user_id);


-- ──────────────────────────────────────────
-- 5. CUSTOMERS (клиенты)
-- ──────────────────────────────────────────
create table if not exists public.customers (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  city         text,
  orders_count integer default 0,
  status       text not null default 'Новый'
                check (status in ('Активный', 'На паузе', 'Новый')),
  revenue      text,
  created_at   timestamptz default now()
);

alter table public.customers enable row level security;

drop policy if exists "customers: own read"   on public.customers;
drop policy if exists "customers: own insert" on public.customers;
drop policy if exists "customers: own update" on public.customers;
drop policy if exists "customers: own delete" on public.customers;

create policy "customers: own read"   on public.customers for select using (auth.uid() = user_id);
create policy "customers: own insert" on public.customers for insert with check (auth.uid() = user_id);
create policy "customers: own update" on public.customers for update using (auth.uid() = user_id);
create policy "customers: own delete" on public.customers for delete using (auth.uid() = user_id);
