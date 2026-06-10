-- ================================================================
-- Cargora: land_routes table
-- Run in Supabase SQL Editor
-- ================================================================

create table if not exists public.land_routes (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  route_code  text not null,
  from_city   text not null,
  to_city     text not null,
  carrier     text,
  cargo       text,
  vehicle     text,
  status      text not null default 'Ожидает отправки'
              check (status in ('В пути', 'Ожидает отправки', 'Доставлен')),
  distance    text,
  eta         text,
  progress    numeric(5,4) default 0 check (progress >= 0 and progress <= 1),
  -- [[lng, lat], ...] координаты дорожных точек
  waypoints   jsonb not null default '[]',
  created_at  timestamptz default now()
);

alter table public.land_routes enable row level security;

drop policy if exists "land_routes: own read"   on public.land_routes;
drop policy if exists "land_routes: own insert" on public.land_routes;
drop policy if exists "land_routes: own update" on public.land_routes;
drop policy if exists "land_routes: own delete" on public.land_routes;
drop policy if exists "land_routes: all read"   on public.land_routes;

-- Any authenticated user can read ALL routes (demo data visible to everyone)
create policy "land_routes: all read"
  on public.land_routes for select
  using (auth.role() = 'authenticated');

create policy "land_routes: own insert"
  on public.land_routes for insert
  with check (auth.uid() = user_id);

create policy "land_routes: own update"
  on public.land_routes for update
  using (auth.uid() = user_id);

create policy "land_routes: own delete"
  on public.land_routes for delete
  using (auth.uid() = user_id);
