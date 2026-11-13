-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.meter_records (
  id text primary key,
  date text not null,
  account_number text not null,
  account_name text not null,
  address text not null,
  meter_number text not null,
  meter_reader text not null,
  remarks text not null,
  contact_number text not null default '',
  landmark text not null default '',
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
  meter_number text not null,
  meter_reader text not null,
  remarks text not null,
  contact_number text not null default '',
  landmark text not null default '',
  date_received text not null default '',
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  deleted_at text not null,
  deleted_by text not null
);

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
