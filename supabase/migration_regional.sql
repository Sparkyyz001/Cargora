-- ================================================================
-- Мангистау: внутрирегиональные перевозки
-- Запустить в Supabase SQL Editor
-- ================================================================

-- 1. Населённые пункты области
create table if not exists public.settlements (
  id          bigserial primary key,
  name        text not null unique,
  name_kz     text,
  district    text,
  lat         numeric(9,6) not null,
  lng         numeric(9,6) not null,
  population  integer,
  is_remote   boolean default false,
  created_at  timestamptz default now()
);

alter table public.settlements enable row level security;
drop policy if exists "settlements: all read" on public.settlements;
create policy "settlements: all read" on public.settlements
  for select using (true);

-- 2. Кэш расстояний между парами НП (чтобы не дёргать OSRM на демо)
create table if not exists public.distance_matrix (
  from_id      bigint not null references public.settlements(id) on delete cascade,
  to_id        bigint not null references public.settlements(id) on delete cascade,
  km           numeric(8,2) not null,
  minutes      integer not null,
  geometry     jsonb,            -- GeoJSON LineString координаты дороги
  approximate  boolean default false,  -- true = гаверсинус-фолбэк, не OSRM
  primary key (from_id, to_id)
);

alter table public.distance_matrix enable row level security;
drop policy if exists "distance_matrix: all read" on public.distance_matrix;
create policy "distance_matrix: all read" on public.distance_matrix
  for select using (true);

-- 3. Расширяем orders под внутрирегиональные перевозки
alter table public.orders add column if not exists from_settlement_id bigint references public.settlements(id);
alter table public.orders add column if not exists to_settlement_id   bigint references public.settlements(id);
alter table public.orders add column if not exists body_type          text;
alter table public.orders add column if not exists pickup_from        timestamptz;
alter table public.orders add column if not exists pickup_to          timestamptz;
alter table public.orders add column if not exists carrier_id         uuid references auth.users(id);
alter table public.orders add column if not exists matched_backhaul_id bigint references public.orders(id);
alter table public.orders add column if not exists distance_km        numeric(8,2);
alter table public.orders add column if not exists empty_km_saved     numeric(8,2) default 0;
alter table public.orders add column if not exists tenge_saved        numeric(12,2) default 0;
alter table public.orders add column if not exists price_kzt          numeric(12,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_body_type_check') then
    alter table public.orders add constraint orders_body_type_check
      check (body_type is null or body_type in
        ('tent','refrigerator','dump','flatbed','manipulator'));
  end if;
end $$;

-- 4. Расширяем vehicles
alter table public.vehicles add column if not exists body_type   text;
alter table public.vehicles add column if not exists capacity_kg integer;
alter table public.vehicles add column if not exists current_lat numeric(9,6);
alter table public.vehicles add column if not exists current_lng numeric(9,6);
alter table public.vehicles add column if not exists home_settlement_id bigint references public.settlements(id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vehicles_body_type_check') then
    alter table public.vehicles add constraint vehicles_body_type_check
      check (body_type is null or body_type in
        ('tent','refrigerator','dump','flatbed','manipulator'));
  end if;
end $$;

-- 5. Биржа: перевозчик должен видеть ЧУЖИЕ заявки, иначе матчинга не будет
drop policy if exists "orders: marketplace read" on public.orders;
create policy "orders: marketplace read" on public.orders
  for select using (
    auth.uid() = user_id
    or auth.uid() = carrier_id
    or status in ('Ожидает отправки', 'Жіберілуді күтуде')
  );

-- 6. Перевозчик может взять свободную заявку
drop policy if exists "orders: carrier claim" on public.orders;
create policy "orders: carrier claim" on public.orders
  for update using (
    auth.uid() = user_id
    or (carrier_id is null and status in ('Ожидает отправки','Жіберілуді күтуде'))
    or auth.uid() = carrier_id
  );

-- 7. Индексы под матчинг
create index if not exists idx_orders_matching
  on public.orders (status, from_settlement_id, to_settlement_id, pickup_from);
create index if not exists idx_orders_carrier on public.orders (carrier_id);

-- 8. Автопарк виден всем авторизованным — биржа подбирает машину под заявку
drop policy if exists "vehicles: all read" on public.vehicles;
create policy "vehicles: all read" on public.vehicles
  for select using (auth.role() = 'authenticated');

-- 9. Realtime на orders — заявка прилетает перевозчику мгновенно
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
