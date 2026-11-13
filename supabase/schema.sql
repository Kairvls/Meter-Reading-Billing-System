-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.meter_records (
  id text primary key,
  date text not null,
  account_number text not null,
  account_name text not null,
  address text not null,
  home_address text not null default '',
  barangay text not null default '',
  street_block text not null default '',
  meter_number text not null,
  meter_reader text not null,
  sep_meter_reader text not null default '',
  remarks text not null,
  contact_number text not null default '',
  landmark text not null default '',
  latitude text not null default '',
  longitude text not null default '',
  image_url text not null default '',
  date_received text not null default '',
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null
);

create table if not exists public.deleted_meter_records (
  id text primary key,
  date text not null,
  account_number text not null,
  account_name text not null,
  address text not null,
  home_address text not null default '',
  barangay text not null default '',
  street_block text not null default '',
  meter_number text not null,
  meter_reader text not null,
  sep_meter_reader text not null default '',
  remarks text not null,
  contact_number text not null default '',
  landmark text not null default '',
  latitude text not null default '',
  longitude text not null default '',
  image_url text not null default '',
  date_received text not null default '',
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  deleted_at text not null,
  deleted_by text not null
);

create table if not exists public.lookup_values (
  id text primary key,
  kind text not null,
  name text not null,
  created_at text not null
);

create index if not exists idx_lookup_values_kind_name
  on public.lookup_values (kind, name);

create table if not exists public.activity_logs (
  id text primary key,
  action text not null,
  actor text not null,
  message text not null,
  record_id text null,
  account_number text null,
  account_name text null,
  created_at text not null
);

create table if not exists public.admin_settings (
  id text primary key default 'admin',
  username text not null,
  password_hash text not null,
  updated_at text not null
);

create index if not exists idx_meter_records_sort
  on public.meter_records (sort_order, created_at);

create index if not exists idx_deleted_meter_records_deleted_at
  on public.deleted_meter_records (deleted_at desc);

create index if not exists idx_activity_logs_created_at
  on public.activity_logs (created_at desc);

-- Optional: allow service role full access (default for service role key).
-- Keep RLS off for server-only access, or add policies later.
alter table public.meter_records enable row level security;
alter table public.deleted_meter_records enable row level security;
alter table public.activity_logs enable row level security;
alter table public.admin_settings enable row level security;

-- If tables already exist, run these alters once:
-- alter table public.meter_records add column if not exists latitude text not null default '';
-- alter table public.meter_records add column if not exists longitude text not null default '';
-- alter table public.meter_records add column if not exists image_url text not null default '';
-- alter table public.meter_records add column if not exists sep_meter_reader text not null default '';
-- alter table public.deleted_meter_records add column if not exists latitude text not null default '';
-- alter table public.deleted_meter_records add column if not exists longitude text not null default '';
-- alter table public.deleted_meter_records add column if not exists image_url text not null default '';
-- alter table public.deleted_meter_records add column if not exists sep_meter_reader text not null default '';
-- create table if not exists public.lookup_values (
--   id text primary key,
--   kind text not null,
--   name text not null,
--   created_at text not null
-- );
