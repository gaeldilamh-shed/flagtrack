-- ============================================================
-- FlagTrack — Supabase Schema
-- Run this entire file in Supabase SQL Editor (one click)
-- ============================================================

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  hourly_rate numeric(10, 2) default 0,
  currency text default 'USD',
  pay_frequency text default 'biweekly',  -- daily | weekly | biweekly | monthly
  shop_name text,
  notifications_enabled boolean default true,
  require_unlock_for_rate boolean default true,
  hide_money_on_home boolean default false,
  auto_hide_after_10s boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ---------- TICKETS ----------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_order text,
  ticket_date date default current_date,
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  vehicle_engine text,
  vin text,
  license_plate text,
  customer_name text,
  store_number text,
  total_flag_hours numeric(10, 2) default 0,
  status text default 'draft',  -- draft | confirmed | pending | removed
  image_path text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tickets_user_date_idx on public.tickets (user_id, ticket_date desc);

alter table public.tickets enable row level security;

create policy "tickets_select_own" on public.tickets
  for select using (auth.uid() = user_id);

create policy "tickets_insert_own" on public.tickets
  for insert with check (auth.uid() = user_id);

create policy "tickets_update_own" on public.tickets
  for update using (auth.uid() = user_id);

create policy "tickets_delete_own" on public.tickets
  for delete using (auth.uid() = user_id);

-- ---------- TICKET LINES ----------
create table if not exists public.ticket_lines (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  position int default 0,
  description text not null,
  quantity numeric(8, 2) default 1,
  flag_hours_per_unit numeric(6, 2) default 0,
  total_flag_hours numeric(8, 2) default 0,
  status text default 'confirmed',  -- confirmed | estimated | pending | added_later | removed
  split_percentage numeric(5, 2) default 100,  -- the user's share of the labor
  match_confidence text,  -- high | medium | low
  notes text,
  created_at timestamptz default now()
);

create index if not exists ticket_lines_ticket_idx on public.ticket_lines (ticket_id);

alter table public.ticket_lines enable row level security;

create policy "ticket_lines_select" on public.ticket_lines
  for select using (
    auth.uid() = (select user_id from public.tickets where id = ticket_lines.ticket_id)
  );

create policy "ticket_lines_insert" on public.ticket_lines
  for insert with check (
    auth.uid() = (select user_id from public.tickets where id = ticket_lines.ticket_id)
  );

create policy "ticket_lines_update" on public.ticket_lines
  for update using (
    auth.uid() = (select user_id from public.tickets where id = ticket_lines.ticket_id)
  );

create policy "ticket_lines_delete" on public.ticket_lines
  for delete using (
    auth.uid() = (select user_id from public.tickets where id = ticket_lines.ticket_id)
  );

-- ---------- FLAG LIBRARY (per user, vehicle-aware) ----------
create table if not exists public.flag_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text,
  service_name text not null,
  flag_hours numeric(6, 2) not null,
  vehicle_make text,   -- nullable = global default
  vehicle_model text,  -- nullable = applies to all models of make
  vehicle_year_min int,
  vehicle_year_max int,
  is_default boolean default false,  -- seeded vs user-added
  use_count int default 0,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists flag_library_user_idx on public.flag_library (user_id);
create index if not exists flag_library_service_idx on public.flag_library (user_id, service_name);

alter table public.flag_library enable row level security;

create policy "flag_library_select_own" on public.flag_library
  for select using (auth.uid() = user_id);

create policy "flag_library_insert_own" on public.flag_library
  for insert with check (auth.uid() = user_id);

create policy "flag_library_update_own" on public.flag_library
  for update using (auth.uid() = user_id);

create policy "flag_library_delete_own" on public.flag_library
  for delete using (auth.uid() = user_id);

-- ---------- GOALS ----------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_type text not null,  -- income | hours
  period text not null,     -- daily | weekly | biweekly | monthly | quarterly | semester | yearly
  target_amount numeric(10, 2) not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals for update using (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals for delete using (auth.uid() = user_id);

-- ---------- PAYCHECKS ----------
create table if not exists public.paychecks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  actual_amount numeric(10, 2) not null,
  expected_amount numeric(10, 2),
  notes text,
  created_at timestamptz default now()
);

alter table public.paychecks enable row level security;

create policy "paychecks_select_own" on public.paychecks for select using (auth.uid() = user_id);
create policy "paychecks_insert_own" on public.paychecks for insert with check (auth.uid() = user_id);
create policy "paychecks_update_own" on public.paychecks for update using (auth.uid() = user_id);
create policy "paychecks_delete_own" on public.paychecks for delete using (auth.uid() = user_id);

-- ---------- AUDIT LOGS ----------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,  -- ticket | ticket_line | goal | paycheck
  entity_id uuid not null,
  action text not null,        -- create | update | delete
  changes jsonb,
  created_at timestamptz default now()
);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_own" on public.audit_logs for select using (auth.uid() = user_id);
create policy "audit_logs_insert_own" on public.audit_logs for insert with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET for ticket images
-- ============================================================
insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', false)
on conflict (id) do nothing;

-- Storage RLS policies: each user can only access their own files
create policy "Users can upload their own ticket images"
  on storage.objects for insert
  with check (bucket_id = 'tickets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view their own ticket images"
  on storage.objects for select
  using (bucket_id = 'tickets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own ticket images"
  on storage.objects for delete
  using (bucket_id = 'tickets' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- TRIGGER: Auto-create profile + seed flag library on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Create profile (idempotent)
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;

  -- Seed default flag library
  insert into public.flag_library (user_id, category, service_name, flag_hours, is_default) values
    (new.id, 'Oil Change', 'Conventional Oil Change', 0.3, true),
    (new.id, 'Oil Change', 'Synthetic Blend Oil Change', 0.4, true),
    (new.id, 'Oil Change', 'Full Synthetic Oil Change', 0.5, true),
    (new.id, 'Oil Change', 'DEXOS Full Synthetic Oil Change', 0.5, true),
    (new.id, 'Oil Change', 'High Mileage Oil Change', 0.4, true),
    (new.id, 'Oil Change', 'Diesel Oil Change', 0.7, true),
    (new.id, 'Tires', 'Tire Rotation', 0.3, true),
    (new.id, 'Tires', 'Tire Mount & Balance (per tire)', 0.3, true),
    (new.id, 'Tires', 'TPMS Reset', 0.2, true),
    (new.id, 'Tires', 'TPMS Sensor Replacement (each)', 0.4, true),
    (new.id, 'Tires', 'Flat Repair', 0.4, true),
    (new.id, 'Tires', 'Wheel Balance (per wheel)', 0.2, true),
    (new.id, 'Alignment', 'Two-Wheel Alignment', 0.7, true),
    (new.id, 'Alignment', 'Four-Wheel Alignment', 1.0, true),
    (new.id, 'Alignment', 'Alignment Check', 0.3, true),
    (new.id, 'Brakes', 'Front Brake Pads', 1.0, true),
    (new.id, 'Brakes', 'Rear Brake Pads', 1.0, true),
    (new.id, 'Brakes', 'Front Pads + Rotors', 1.5, true),
    (new.id, 'Brakes', 'Rear Pads + Rotors', 1.5, true),
    (new.id, 'Brakes', 'Brake Inspection', 0.3, true),
    (new.id, 'Brakes', 'Brake Fluid Flush', 0.8, true),
    (new.id, 'Brakes', 'Caliper Replacement (each)', 0.8, true),
    (new.id, 'Battery', 'Battery Test', 0.2, true),
    (new.id, 'Battery', 'Battery Install', 0.4, true),
    (new.id, 'Battery', 'Battery Terminal Service', 0.3, true),
    (new.id, 'Filters', 'Engine Air Filter', 0.2, true),
    (new.id, 'Filters', 'Cabin Air Filter', 0.3, true),
    (new.id, 'Filters', 'Fuel Filter Replacement', 0.6, true),
    (new.id, 'Fluids', 'Coolant Flush', 0.8, true),
    (new.id, 'Fluids', 'Transmission Fluid Service', 0.9, true),
    (new.id, 'Fluids', 'Power Steering Flush', 0.6, true),
    (new.id, 'Fluids', 'Differential Fluid Service', 0.5, true),
    (new.id, 'Fluids', 'Transfer Case Service', 0.5, true),
    (new.id, 'Visibility', 'Front Wiper Blades', 0.1, true),
    (new.id, 'Visibility', 'Rear Wiper Blade', 0.1, true),
    (new.id, 'Visibility', 'Headlight Bulb Replacement (each)', 0.3, true),
    (new.id, 'Visibility', 'Tail/Brake Bulb Replacement (each)', 0.2, true),
    (new.id, 'Visibility', 'Headlight Restoration', 0.6, true),
    (new.id, 'Belts', 'Serpentine Belt Replacement', 0.7, true),
    (new.id, 'Belts', 'Timing Belt Replacement', 4.0, true),
    (new.id, 'Diagnostic', 'Courtesy Check', 0.2, true),
    (new.id, 'Diagnostic', 'Basic Diagnostic', 1.0, true),
    (new.id, 'Diagnostic', 'Check Engine Light Diagnostic', 1.0, true),
    (new.id, 'Diagnostic', 'AC System Diagnostic', 1.0, true),
    (new.id, 'Diagnostic', 'Electrical Diagnostic', 1.5, true),
    (new.id, 'AC', 'AC Recharge (R-134a)', 0.7, true),
    (new.id, 'AC', 'AC Recharge (R-1234yf)', 0.9, true),
    (new.id, 'Misc', 'Spark Plug Replacement (4-cyl)', 0.8, true),
    (new.id, 'Misc', 'Spark Plug Replacement (6-cyl)', 1.2, true),
    (new.id, 'Misc', 'Spark Plug Replacement (8-cyl)', 1.5, true);

  -- Seed default goal (weekly income $1500)
  insert into public.goals (user_id, goal_type, period, target_amount, is_active) values
    (new.id, 'income', 'weekly', 1500, true),
    (new.id, 'hours', 'weekly', 45, true);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
